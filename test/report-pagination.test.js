import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Booking } from '../models/booking.model.js';
import bookingController from '../controllers/booking.controller.js';
import { createApp } from '../app.js';
import router from '../routes/index.js';
import { getReportPagination, paginationMetadata, paginateReportPayload, queryReportPage, queryGroupedReportPage, REPORT_PATHS } from '../utils/report-pagination.js';

const companyId = '507f1f77bcf86cd799439011';
const user = { companyId, id: '507f1f77bcf86cd799439012', role: 'employee', branchId: 'MAIN001' };
const response = () => ({ statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } });

test('every covered report handler is mounted with pagination validation', () => {
  const covered = new Set();
  for (const mount of router.stack) for (const layer of mount.handle.stack || []) {
    if (!layer.route) continue;
    const handlers = layer.route.stack.map(entry => entry.handle.name);
    for (const name of handlers) if (name in REPORT_PATHS) {
      assert.ok(handlers.includes('prepareReportPagination'), name);
      covered.add(name);
    }
  }
  assert.deepEqual([...covered].sort(), Object.keys(REPORT_PATHS).sort());
});

test('report pagination defaults, body support, query precedence and capped limits', () => {
  assert.deepEqual(getReportPagination({}), { page: 1, limit: 25, skip: 0 });
  assert.deepEqual(getReportPagination({ body: { page: 3, limit: 10 } }), { page: 3, limit: 10, skip: 20 });
  assert.deepEqual(getReportPagination({ query: { page: '2', limit: '1000' }, body: { page: 7 } }), { page: 2, limit: 100, skip: 100 });
});
test('invalid pagination is rejected instead of silently producing incorrect offsets', () => {
  for (const value of ['0', '-1', '1.5', 'abc', '', true, [], {}, Infinity, '1e3']) {
    assert.throws(() => getReportPagination({ query: { page: value } }), /positive integer/);
    assert.throws(() => getReportPagination({ body: { limit: value } }), /positive integer/);
  }
  assert.throws(() => getReportPagination({ query: { page: Number.MAX_SAFE_INTEGER, limit: 100 } }), /too large/);
});
test('pagination metadata handles last, empty and out-of-range pages', () => {
  assert.equal(paginationMetadata({ page: 2, limit: 10 }, 15, 5).nextPage, null);
  assert.equal(paginationMetadata({ page: 3, limit: 10 }, 15, 0).prevPage, 2);
  assert.equal(paginationMetadata({ page: 1, limit: 25 }, 0, 0).totalPages, 0);
});
test('flat computed reports page rows while preserving full-result summaries', () => {
  const payload = { data: [1, 2, 3, 4, 5], summary: { totalAmount: 500 } };
  const result = paginateReportPayload(payload, 'parcelBookingSummaryReport', { page: 2, limit: 2, skip: 2 });
  assert.deepEqual(result.data, [3, 4]);
  assert.equal(result.summary.totalAmount, 500);
  assert.equal(result.pagination.totalRecords, 5);
  assert.deepEqual(payload.data, [1, 2, 3, 4, 5]);
});
test('grouped reports apply one page window across groups and retain group totals', () => {
  const payload = { data: { paid: { bookings: [4, 5, 6], allGrandTotal: 300 }, credit: { bookings: [1, 2, 3], allGrandTotal: 200 } }, finalSummary: { total: 500 } };
  const result = paginateReportPayload(payload, 'parcelBookingReports', { page: 2, limit: 2, skip: 2 });
  assert.deepEqual(result.data.credit.bookings, [3]);
  assert.deepEqual(result.data.paid.bookings, [4]);
  assert.equal(result.data.paid.allGrandTotal, 300);
  assert.equal(result.pagination.totalRecords, 6);
  assert.equal(result.pagination.returnedRecords, 2);
  assert.equal(payload.data.credit.bookings.length, 3);
});
test('nested row pagination leaves package arrays and summary arrays complete', () => {
  const payload = { data: { deliveries: [{ packages: [1, 2, 3] }, { packages: [4, 5] }], summary: { totalPackages: 5 } } };
  const result = paginateReportPayload(payload, 'deliveredStockReport', { page: 1, limit: 1, skip: 0 });
  assert.equal(result.data.deliveries.length, 1);
  assert.deepEqual(result.data.deliveries[0].packages, [1, 2, 3]);
  assert.equal(result.data.summary.totalPackages, 5);
});
test('raw-array report responses use a data envelope with pagination', () => {
  const result = paginateReportPayload([1, 2, 3], 'salesSummaryByBranchWise', { page: 2, limit: 2, skip: 2 });
  assert.deepEqual(result.data, [3]);
  assert.equal(result.pagination.totalRecords, 3);
});
test('summary groups have deterministic ordering and consolidated delivery pages keep separate counts', () => {
  const summary = paginateReportPayload({ branches: [{ branchName: 'Z' }, { branchName: 'A' }], totals: { amount: 100 } }, 'branchWiseCollectionReport', { page: 1, limit: 1, skip: 0 });
  assert.equal(summary.branches[0].branchName, 'A');
  const original = { BookingTypes: { paid: [1, 2, 3] }, deliverToPayDetails: [4, 5, 6, 7], deliverToPayTotals: { grandTotal: 500 } };
  const result = paginateReportPayload(original, 'consolidatedReportBranch', { page: 2, limit: 2, skip: 2 });
  assert.deepEqual(result.BookingTypes.paid, [3]);
  assert.deepEqual(result.deliverToPayDetails, [6, 7]);
  assert.equal(result.pagination.totalRecords, 3);
  assert.equal(result.pagination.sections.deliverToPayDetails.totalRecords, 4);
  assert.equal(result.deliverToPayTotals.grandTotal, 500);
  assert.equal(original.deliverToPayDetails.length, 4);
});

function mockFind(t, rows) {
  return t.mock.method(mongoose.Query.prototype, 'exec', async function() {
    assert.equal(this.model.modelName, 'Booking');
    const options = this.getOptions();
    assert.ok(options.limit <= 100);
    assert.ok(options.sort._id);
    return rows.slice(options.skip, options.skip + options.limit);
  });
}
test('record queries send skip/limit to MongoDB and total aggregates keep company scope', async t => {
  mockFind(t, Array.from({ length: 60 }, (_, index) => ({ grnNo: index + 1 })));
  t.mock.method(Booking, 'aggregate', async pipeline => {
    assert.equal(String(pipeline[0].$match.companyId), companyId);
    assert.ok(pipeline[0].$match.companyId instanceof mongoose.Types.ObjectId);
    assert.equal(pipeline[1].$group.amount.$sum, '$grandTotal');
    return [{ totalRecords: 60, amount: 6000 }];
  });
  const result = await queryReportPage(Booking.find({ companyId }).sort({ bookingDate: -1 }), { query: { page: '2', limit: '25' } }, { amount: '$grandTotal' });
  assert.equal(result.rows.length, 25);
  assert.equal(result.rows[0].grnNo, 26);
  assert.equal(result.totals.amount, 6000);
  assert.equal(result.pagination.totalPages, 3);
});
test('out-of-range record pages retain full totals instead of claiming no matches', async t => {
  mockFind(t, [{ grnNo: 1 }]);
  t.mock.method(Booking, 'aggregate', async () => [{ totalRecords: 1, allGrandTotal: 500, allTotalQuantity: 2 }]);
  const res = response();
  await bookingController.regularCustomerBooking({ user, body: {}, query: { page: '3', limit: '1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, []);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.allGrandTotal, 500);
  assert.equal(res.body.pagination.totalRecords, 1);
});
test('grouped DB pages preserve totals for groups with no rows on the current page', async t => {
  mockFind(t, [{ bookingType: 'credit', grnNo: 1 }, { bookingType: 'credit', grnNo: 2 }, { bookingType: 'paid', grnNo: 3 }]);
  t.mock.method(Booking, 'aggregate', async () => [
    { _id: 'credit', count: 2, allGrandTotal: 200, allTotalPackages: 2, allTotalQuantity: 2 },
    { _id: 'paid', count: 1, allGrandTotal: 100, allTotalPackages: 1, allTotalQuantity: 1 },
  ]);
  const result = await queryGroupedReportPage(Booking, { companyId }, ['paid', 'credit'], { query: { page: '2', limit: '2' } }, { select: 'bookingType grnNo' });
  assert.equal(result.data.credit.bookings.length, 0);
  assert.equal(result.data.credit.allGrandTotal, 200);
  assert.equal(result.data.paid.bookings.length, 1);
  assert.equal(result.pagination.totalRecords, 3);
});
test('booking type reports keep employee branch filters in both page and total queries', async t => {
  mockFind(t, [{ bookingType: 'paid', grnNo: 1 }]);
  t.mock.method(Booking, 'aggregate', async pipeline => {
    assert.equal(pipeline[0].$match.pickUpBranch, user.branchId);
    return [{ _id: 'paid', count: 1, allGrandTotal: 100 }];
  });
  const res = response();
  await bookingController.parcelBookingReports({ user, body: { fromDate: '2026-10-01', toDate: '2026-10-29' }, query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.paid.allGrandTotal, 100);
  assert.equal(res.body.pagination.totalRecords, 1);
});
test('all paginated report routes reject bad page parameters before database access', async t => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'pagination-test-only';
  process.env.NODE_ENV = 'test';
  t.after(() => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const token = jwt.sign(user, process.env.JWT_SECRET);
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/booking/parcel-booking-report', '/booking/consolidated-report-branch', '/parcel-loading/parcel-status-report', '/parcel-unloading/pending-delivery-report', '/voucher-generate/voucher-details']) {
    const res = await fetch(base + route + '?page=0', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(res.status, 400, route);
    assert.match((await res.json()).message, /page must be/);
  }
});
