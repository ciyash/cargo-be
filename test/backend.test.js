import { test } from 'node:test';
import assert from 'node:assert/strict';  
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Counter from "../src/models/counter.model.js";
import ParcelLoading from "../src/models/parcel.loading.model.js";
import ParcelUnloading from "../src/models/parcel.unloading.model.js";
import { Booking } from "../src/models/booking.model.js";
import Branch from "../src/models/branch.model.js";
import Company from "../src/models/company.model.js";
import Subadmin from "../src/models/admin.auth.model.js";
import { validateParcelInput, recordParcel } from "../src/services/parcel-workflow.js";
import { nextSequence } from "../src/services/sequence.js";
import { deliverBooking } from "../src/services/delivery-workflow.js";
import { createVouchers } from "../src/services/voucher-workflow.js";
import CFVoucher from "../src/models/cf.voucher.generate.model.js";
import { Delivery } from "../src/models/booking.model.js";
import { dateRange, escapeRegex } from "../src/utils/api-error.js";
import { writableFields } from "../src/utils/update-fields.js";
import { validateEnvironment } from "../src/config/environment.js";
import branchController from "../src/controllers/branch.controller.js";
import companyController from "../src/controllers/company.controller.js";
import branchReportController from "../src/controllers/branch.report.controller.js";
import { Expense, BranchDailySnapshot } from "../src/models/expensive.model.js";
import { createApp } from "../src/app.js";

const user = { companyId: '507f1f77bcf86cd799439011', id: '507f1f77bcf86cd799439012', branchName: 'Main', branchId: 'MAIN001' };
const input = () => ({ fromCity: 'Hyderabad', toCity: ['Vijayawada'], fromBranch: 'MAIN001', vehicalNumber: 'TS09AB1234', driverName: 'Test Driver', driverNo: 9000000001, grnNo: ['1001'], lrNumber: ['TEST/0001/1001'] });
const booking = () => ({ grnNo: 1001, lrNumber: 'TEST/0001/1001', bookingStatus: 0, fromCity: 'Hyderabad', toCity: 'Vijayawada' });
function response() { return { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(value) { this.body = value; return this; } }; }
function query(value) { return { sort() { return this; }, select() { return this; }, session() { return this; }, lean: async () => value }; }

test('environment validation reports missing settings and rejects invalid ports', () => {
  assert.throws(() => validateEnvironment({}), /MONGO_URI, JWT_SECRET, COMPANY_SECRET/);
  const env = { MONGO_URI: 'test', JWT_SECRET: 'test', COMPANY_SECRET: 'test' };
  assert.equal(validateEnvironment(env).port, 4000);
  assert.throws(() => validateEnvironment({ ...env, PORT: 'abc' }), /PORT/);
  assert.throws(() => validateEnvironment({ ...env, PORT: '70000' }), /PORT/);
});

test('parcel inputs normalize numeric strings and reject invalid or excessive GRNs', () => {
  assert.deepEqual(validateParcelInput(input(), user).grnNo, [1001]);
  for (const grnNo of [[], [1001, '1001'], [NaN], [Infinity], [0], [-1], [''], [null], [true], Array(1001).fill(1)]) {
    assert.throws(() => validateParcelInput({ ...input(), grnNo }, user));
  }
});
test('parcel input validates identity, cities and GRN/LR counts', () => {
  assert.throws(() => validateParcelInput(input(), {}), /Company and user/);
  for (const toCity of ['Hyderabad', [], [null], ['']]) assert.throws(() => validateParcelInput({ ...input(), toCity }, user), /toCity/);
  assert.throws(() => validateParcelInput({ ...input(), lrNumber: [] }, user), /one LR/);
});
test('updates cannot modify ownership or inject MongoDB operators', () => {
  assert.deepEqual(writableFields({ companyId: 'other', _id: 'other', remarks: 'ok' }), { remarks: 'ok' });
  assert.throws(() => writableFields({ $set: {} }), /Invalid update/);
  assert.throws(() => writableFields({ 'companyId.value': 'other' }), /Invalid update/);
  assert.throws(() => writableFields([]), /update object/);
});
test('regex filters are literal and date ranges reject invalid and reversed dates', () => {
  const literal = 'City (East).*';
  assert.equal(new RegExp('^' + escapeRegex(literal) + '$').test(literal), true);
  assert.equal(new RegExp('^' + escapeRegex(literal) + '$').test('City East anything'), false);
  assert.throws(() => dateRange('invalid', '2026-10-29'), /valid start/);
  assert.throws(() => dateRange('2026-10-30', '2026-10-01'), /after/);
});

function mockWorkflow(t, { unloading = false, rows = [booking()], failSave = false, matchedCount = 1 } = {}) {
  const Model = unloading ? ParcelUnloading : ParcelLoading;
  const state = { ended: 0, transactions: 0, aborted: 0, updates: [], saves: [] };
  const session = {
    async withTransaction(fn) { state.transactions++; try { return await fn(); } catch (error) { state.aborted++; throw error; } },
    async endSession() { state.ended++; },
  };
  t.mock.method(Model, 'findOne', () => query(null));
  t.mock.method(Counter, 'findOneAndUpdate', async () => ({ value: 100001 }));
  t.mock.method(Model, 'startSession', async () => session);
  t.mock.method(Branch, 'findOne', () => query({name:'Selected branch',city:'Hyderabad'}));
  t.mock.method(Booking, 'find', filter => {
    assert.equal(filter.companyId, user.companyId);
    assert.deepEqual(filter.grnNo.$in, [1001]);
    return query(rows);
  });
  t.mock.method(Booking, 'updateMany', async (filter, update, options) => {
    state.updates.push({ filter, update, options }); return { matchedCount };
  });
  t.mock.method(Model.prototype, 'save', async function(options) {
    state.saves.push({ document: this, options });
    if (failSave) throw new Error('Save failed');
    return this;
  });
  state.session = session;
  return state;
}
test('loading saves parcel and updates company bookings within the same transaction', async t => {
  const state = mockWorkflow(t);
  const result = await recordParcel(input(), user);
  assert.equal(result.parcel.loadingType, 'offload');
  assert.equal(state.updates[0].update.$set.bookingStatus, 1);
  assert.equal(state.updates[0].filter.companyId, user.companyId);
  assert.equal(state.saves[0].options.session, state.session);
  assert.equal(state.updates[0].options.session, state.session);
  assert.equal(state.ended, 1);
});
test('companywide Admin loading records the selected branch without an assigned login branch',async t=>{
 const state=mockWorkflow(t);
 await recordParcel(input(),{...user,role:'company_admin',branchId:null,branchName:''});
 assert.equal(state.updates[0].update.$set.loadingBranchname,'Selected branch');
 assert.equal(state.updates[0].update.$set.ltBranch,'MAIN001');
});
test('branch loading accepts unloaded stock for onward transport', async t => {
  const state = mockWorkflow(t, { rows: [{ ...booking(), bookingStatus: 2 }] });
  const result = await recordParcel(input(), user, { branchTransfer: true });
  assert.equal(result.parcel.loadingType, 'branchLoad');
  assert.equal(state.ended, 1);
});
test('branch unloading updates booking status and persists branch and vehicle fields', async t => {
  const state = mockWorkflow(t, { unloading: true, rows: [{ ...booking(), bookingStatus: 1 }] });
  const result = await recordParcel({ ...input(), unloadBranch: 'DEST001' }, {...user,branchId:'DEST001'}, { unloading: true, branchTransfer: true });
  assert.equal(state.updates[0].update.$set.bookingStatus, 2);
  assert.equal(result.parcel.unloadBranch, 'DEST001');
  assert.equal(result.parcel.vehicleNo, 'TS09AB1234');
  assert.equal(state.ended, 1);
});
for (const [label, options, expected] of [
  ['missing company GRNs', { rows: [] }, /Some GRNs/],
  ['mismatched LRs', { rows: [{ ...booking(), lrNumber: 'OTHER' }] }, /LR numbers do not match/],
  ['already loaded stock', { rows: [{ ...booking(), bookingStatus: 1 }] }, /no longer available/],
  ['already delivered stock', { rows: [{ ...booking(), bookingStatus: 4 }] }, /no longer available/],
  ['concurrent status change', { matchedCount: 0 }, /Bookings changed/],
  ['parcel save failure', { failSave: true }, /Save failed/],
]) test(`transaction rejects ${label} and always closes its session`, async t => {
  const state = mockWorkflow(t, options);
  await assert.rejects(recordParcel(input(), user), expected);
  assert.equal(state.aborted, 1);
  assert.equal(state.ended, 1);
});
test('invalid parcel payload does not allocate a session or query the database', async t => {
  const spy = t.mock.method(ParcelLoading, 'startSession', async () => { throw new Error('must not run'); });
  await assert.rejects(recordParcel({ ...input(), toCity: 'bad' }, user), /toCity/);
  assert.equal(spy.mock.callCount(), 0);
});
test('sequence allocation retries a concurrent initial upsert collision', async t => {
  let calls = 0;
  t.mock.method(Counter, 'findOneAndUpdate', async (filter, update, options) => {
    calls++;
    if (calls === 1) throw Object.assign(new Error('duplicate'), { code: 11000 });
    assert.equal(options.upsert, undefined);
    return { value: 1002 };
  });
  assert.equal(await nextSequence('test', 1000), 1002);
});
test('branch updates use token company scope and ignore ownership changes', async t => {
  let captured;
  t.mock.method(Branch, 'findOneAndUpdate', async (...args) => { captured = args; return { name: 'Updated' }; });
  const res = response();
  await branchController.updateBranch({ params: { id: 'record' }, user:{...user,role:'company_admin'}, body: { name: 'Updated', companyId: 'other', $set: { companyId: 'other' } } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(captured[0], { _id: 'record', companyId: user.companyId });
  assert.deepEqual(captured[1], { $set: { name: 'Updated' } });
});
test('company access handler responds instead of calling an undefined next', async t => {
  t.mock.method(Company, 'findById', () => ({ select: async () => ({ isBlocked: false }) }));
  const res = response();
  await companyController.checkCompanyAccess({ user }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.allowed, true);
});
test('account serialization excludes password and recovery fields', () => {
  const staff = new Subadmin({ password: 'hash', otp: 123456, otpExpires: new Date(), name: 'Test' }).toJSON();
  assert.equal(staff.password, undefined); assert.equal(staff.otp, undefined);
  assert.equal(new Company({ password: 'hash' }).toJSON().password, undefined);
});

test('delivery saves both records in one session and closes it', async t => {
  let ended = 0;
  const session = { withTransaction: fn => fn(), endSession: async () => { ended++; } };
  const row = { ...booking(), _id: user.id, bookingStatus: 2, unloadingBranch: user.branchId, bookingType: 'paid', save: async options => assert.equal(options.session, session) };
  t.mock.method(Booking, 'startSession', async () => session);
  t.mock.method(Booking, 'findOne', filter => {
    assert.equal(filter.companyId, user.companyId);
    return { session: async () => row };
  });
  t.mock.method(Delivery.prototype, 'save', async function(options) { assert.equal(options.session, session); return this; });
  const result = await deliverBooking({ grnNo: 1001, receiverName: 'Test', receiverMobile: '9000000001', toPayDeliveredAmount: 0 }, user);
  assert.equal(result.bookingStatus, 4);
  assert.equal(ended, 1);
});
test('delivery failure propagates through the transaction and closes the session', async t => {
  let ended = 0;
  const session = { withTransaction: fn => fn(), endSession: async () => { ended++; } };
  t.mock.method(Booking, 'startSession', async () => session);
  t.mock.method(Booking, 'findOne', () => ({ session: async () => ({ ...booking(), bookingStatus: 2, unloadingBranch: user.branchId }) }));
  t.mock.method(Delivery.prototype, 'save', async () => { throw new Error('Delivery save failed'); });
  await assert.rejects(deliverBooking({ grnNo: 1001, receiverName: 'Test', receiverMobile: '9000000001', toPayDeliveredAmount: 100 }, user), /Delivery save failed/);
  assert.equal(ended, 1);
});
test('delivery rejects negative amounts and missing branch identity before using DB', async () => {
  await assert.rejects(deliverBooking({ grnNo: 1001, receiverName: 'Test', receiverMobile: '9', toPayDeliveredAmount: -1 }, user), /non-negative/);
  await assert.rejects(deliverBooking({}, { companyId: user.companyId, id: user.id }), /branch details/);
});
test('vouchers batch writes by agent safely even for prototype-like agent names', async t => {
  let ended = 0;
  const session = { withTransaction: fn => fn(), endSession: async () => { ended++; } };
  t.mock.method(CFVoucher, 'startSession', async () => session);
  t.mock.method(CFVoucher, 'findOne', () => query(null));
  t.mock.method(Counter, 'findOneAndUpdate', async () => ({ value: 100 }));
  t.mock.method(Booking, 'find', () => query([{ ...booking(), bookingType:'credit', pickUpBranch:user.branchId, agent: '__proto__', pickUpBranchname: 'Main', dropBranchname: 'Destination', senderName: 'Test', grandTotal: 100 }]));
  t.mock.method(CFVoucher, 'insertMany', async (rows, options) => {
    assert.equal(options.session, session);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].creditForAgent, '__proto__');
    assert.equal(rows[0].voucherNo, 100);
    return rows;
  });
  t.mock.method(Booking, 'updateMany', async (filter, update, options) => {
    assert.equal(options.session, session); assert.equal(filter.companyId, user.companyId);
    return { matchedCount: 1 };
  });
  assert.equal((await createVouchers({ grnNo: [1001] }, user)).length, 1);
  assert.equal(ended, 1);
});
test('voucher duplicate attempt closes session and does not insert documents', async t => {
  let ended = 0;
  t.mock.method(CFVoucher, 'startSession', async () => ({ withTransaction: fn => fn(), endSession: async () => { ended++; } }));
  t.mock.method(Booking, 'find', () => query([{ ...booking(), agent: 'Test', status: true }]));
  const insert = t.mock.method(CFVoucher, 'insertMany', async () => { throw new Error('must not insert'); });
  await assert.rejects(createVouchers({ grnNo: [1001] }, user), /already be vouchered/);
  assert.equal(insert.mock.callCount(), 0);
  assert.equal(ended, 1);
});

test('live branch snapshot uses company ObjectIds, actual expense fields and opening balance', async t => {
  t.mock.method(Branch, 'findOne', filter => {
    assert.equal(filter.companyId, user.companyId);
    return query({ _id: user.id, branchUniqueId:user.branchId, openingBalance: 50 });
  });
  t.mock.method(BranchDailySnapshot, 'findOne', filter => {
    assert.ok(filter.date.$lt instanceof Date);
    return query(null);
  });
  t.mock.method(Booking, 'aggregate', async stages => {
    assert.ok(stages[0].$match.companyId instanceof mongoose.Types.ObjectId);
    return [{ total: stages[0].$match.bookingDate?.$gte ? 100 : 0 }];
  });
  t.mock.method(Expense, 'aggregate', async stages => {
    assert.ok(stages[0].$match.expenseDate);
    assert.deepEqual(stages[0].$match.branchId.$in, ['MAIN001', user.id]);
    return [{ total: stages[0].$match.expenseDate.$gte ? 25 : 0 }];
  });
  const res = response();
  t.mock.method(Delivery, 'aggregate', async () => []);
  await branchReportController.getLiveBranchSnapshot({ user, params: { branchCode: 'MAIN001' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.closingBalance, 125);
});

test('mounted routes load and HTTP boundaries reject missing auth and malformed JSON', async t => {
  process.env.NODE_ENV = 'test';
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const url of ['/branch-report/MAIN/live-snapshot', '/bank/get', '/item/get', '/vendor/get', '/booking']) {
    const res = await fetch(base + url, { method: url.includes('create-order') ? 'POST' : 'GET' });
    assert.equal(res.status, 401, url);
  }
  const malformed = await fetch(base + '/subadmin-auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(malformed.status, 400);
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await fetch(base + '/shiprocket/create-order',{method:'POST'})).status,404);
  const health = await fetch(base + '/health');
  assert.equal(health.status, mongoose.connection.readyState === 1 ? 200 : 503);
  assert.equal(health.headers.get('x-powered-by'), null);
});
