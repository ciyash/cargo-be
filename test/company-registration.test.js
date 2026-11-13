import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import Company from "../src/models/company.model.js";
import Subadmin from "../src/models/admin.auth.model.js";
import Branch from "../src/models/branch.model.js";
import branchController from "../src/controllers/branch.controller.js";
import mongoose from 'mongoose';
import { QuotaEvent } from "../src/models/logistics.model.js";
import { City } from "../src/models/multi.model.js";
import companyController from "../src/controllers/company.controller.js";
import staffController from "../src/controllers/admin.auth.controller.js";

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('company creates its first branch without an existing staff account', async t => {
  const companyId = '507f1f77bcf86cd799439011';
  t.mock.method(City,'findOne',()=>({lean:async()=>({_id:'507f1f77bcf86cd799439099',cityName:'Hyderabad',state:'Telangana',country:'India'})}));
  t.mock.method(Branch.prototype, 'save', async function () {
    assert.equal(this.companyId.toString(), companyId);
    assert.equal(this.createdByCompany.toString(), companyId);
    assert.equal(this.createdBy, undefined);
    assert.equal(this.validateSync(), undefined);
    return this;
  });
  const res = response();
  await branchController.createBranch({ user: { companyId,role:'company' }, body: {
    name: 'First', branchType: 'normal', city: 'Hyderabad', location: 'Main road',
    address: '12 Main road', phone: '9000000001',
    pincode: '500001', state: 'Telangana', country: 'India'
  } }, res);
  assert.equal(res.statusCode, 201);
});

test('public registration normalizes email, hashes password and ignores supplied parent', async t => {
  t.mock.method(mongoose,'startSession',async()=>({withTransaction:fn=>fn(),endSession:async()=>{}}));
  t.mock.method(QuotaEvent,'create',async rows=>{assert.equal(rows[0].kind,'grant');assert.equal(rows[0].count,100);return rows;});
  t.mock.method(Company, 'findOne', async filter => {
    assert.equal(filter.email, 'owner@example.com');
    return null;
  });
  t.mock.method(Company, 'create', async ([data]) => {
    assert.equal(data.parentCompany, null);
    assert.equal(await bcrypt.compare('password123', data.password), true);
    assert.equal(data.bookingQuota.purchased,100);assert.equal(data.bookingQuota.freeGranted,100);assert.equal(data.companyAccess,true);
    return [new Company(data)];
  });
  const res = response();
  await companyController.registerCompany({ body: { name: 'Cargo', email: ' Owner@Example.com ', password: 'password123', parentCompanyId: '507f1f77bcf86cd799439011' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.company.toJSON().password, undefined);
});

test('registration rejects missing fields and short passwords before database access', async () => {
  for (const body of [{}, { name: 'Cargo', email: 'invalid', password: 'password123' }, { name: 'Cargo', email: 'a@b.com', password: 'short' }]) {
    const res = response();
    await companyController.registerCompany({ body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('company creates an admin attached to its token company, without optional username or phone', async t => {
  const companyId = '507f1f77bcf86cd799439011';
  t.mock.method(Subadmin, 'findOne', async filter => {
    assert.deepEqual(filter, { email: 'admin@example.com' });
    return null;
  });
  t.mock.method(Subadmin.prototype, 'save', async function () {
    assert.equal(this.companyId.toString(), companyId);
    assert.equal(this.branchId, null);
    assert.equal(this.role, 'company_admin');
    assert.equal(await bcrypt.compare('password123', this.password), true);
    return this;
  });
  const res = response();
  await staffController.signup({ user: { companyId, role:'company' }, body: { name: 'Admin', email: 'admin@example.com', password: 'password123', role: 'company_admin', companyId: '507f1f77bcf86cd799439099' } }, res);
  assert.equal(res.statusCode, 201);
});

test('staff creation rejects unknown roles and subadmins without a branch', async () => {
  for (const role of ['platform-owner', 'unknown', 'subadmin']) {
    const res = response();
    await staffController.signup({ user: { companyId: '507f1f77bcf86cd799439011' }, body: { name: 'Staff', email: 'staff@example.com', password: 'password123', role } }, res);
    assert.equal(res.statusCode, 400);
  }
});
