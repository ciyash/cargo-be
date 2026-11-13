import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { ownerAuth } from "../src/routes/owner.route.js";
import { ownerReport, ownerReportInput } from '../src/services/owner-report.js';
import Company from '../src/models/company.model.js';
import Branch from '../src/models/branch.model.js';
import Payment from '../src/models/payment.model.js';
import { Booking } from '../src/models/booking.model.js';
import { CourierConnection } from '../src/models/logistics.model.js';
test('owner access rejects company and wrong-role tokens, permits owner', () => {
  const original = { ...process.env };
  process.env.OWNER_EMAIL = 'owner@example.com';
  process.env.OWNER_PASSWORD_HASH = 'configured';
  process.env.OWNER_SECRET = 'a-separate-owner-secret-at-least-32-characters';
  try {
    const sign = role => jwt.sign({ sub: process.env.OWNER_EMAIL, role }, process.env.OWNER_SECRET, { audience: 'cargo-owner', issuer: 'cargo-platform' });
    for (const [token, expected] of [['', false], [jwt.sign({ companyId: 'customer' }, 'company-secret'), false], [sign('admin'), false], [sign('platform-owner'), true]]) {
      let passed = false;
      const res = { code: 200, status(code) { this.code = code; return this; }, json() { return this; } };
      ownerAuth({ headers: { cookie: `cargo_owner=${token}` } }, res, () => { passed = true; });
      assert.equal(passed, expected);
      if (!passed) assert.equal(res.code, 401);
    }
  } finally { for (const key of ['OWNER_EMAIL', 'OWNER_PASSWORD_HASH', 'OWNER_SECRET']) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } }
});

test('owner filters use remaining booking quota, literal search and valid dates',()=>{
  const input=ownerReportInput({from:'2026-11-01',to:'2026-11-13',status:'exhausted',search:'A.*'},new Date('2026-11-13'));
  assert.ok(input.filter.$expr.$lte);
  assert.equal(input.filter.$or[0].name.$regex,'A\\.\\*');
  assert.equal(input.filter.isBlocked.$ne,true);
  for(const query of [{from:'2026-02-30'},{from:'2026-11-14',to:'2026-11-13'},{from:'2020-01-01',to:'2026-01-01'},{status:'invalid'}])assert.throws(()=>ownerReportInput(query),error=>error.status===400);
});

test('owner report exposes scoped projections, current quotas and separate captured revenue',async t=>{
  const chain=value=>({select(fields){assert.ok(!fields.includes('password'));return this;},sort(){return this;},skip(){return this;},limit(){return this;},populate(){return this;},lean:async()=>value});
  t.mock.method(Company,'find',()=>chain([{_id:'company',name:'Test Company',bookingQuota:{purchased:500,used:100,held:20}}]));
  t.mock.method(Company,'countDocuments',async()=>1);
  t.mock.method(Company,'aggregate',async pipeline=>pipeline[0].$group?[{total:1,available:380,used:100,held:20,granted:500}]:[]);
  t.mock.method(Branch,'aggregate',async pipeline=>pipeline[0].$match?[{_id:'company',count:2,franchises:1}]:[{total:2,franchises:1,franchiseAllocated:200,franchiseUsed:100}]);
  t.mock.method(Booking,'aggregate',async pipeline=>pipeline[0].$match.companyId?[{_id:'company',count:4}]:[{bookings:4,freightValue:1000}]);
  t.mock.method(Payment,'find',()=>chain([]));
  t.mock.method(Payment,'aggregate',async pipeline=>{
    if(pipeline[0].$match.status==='paid'){
      assert.ok(pipeline[0].$match.paidAt);assert.equal(pipeline[0].$match.createdAt,undefined);
      return [{_id:'INR',amount:100,bookingPacks:100,services:0}];
    }
    return [{_id:'INR',pending:1}];
  });
  t.mock.method(CourierConnection,'aggregate',async pipeline=>{assert.equal(pipeline[0].$match.providerKey,'delhivery');return [{_id:'staging',connected:1,enabled:1}];});
  const report=await ownerReport({from:'2026-11-01',to:'2026-11-13'});
  assert.equal(report.companies[0].quota.available,380);
  assert.equal(report.companies[0].status,'active');
  assert.equal(report.companies[0].franchises,1);
  assert.equal(report.revenue[0].amount,100);
  assert.equal(report.summary.freightValue,1000);
  assert.equal(report.summary.pendingPayments,1);
});
