import { ApiError } from './api-error.js';
import { validateReportInput } from './report-input.js';

export const REPORT_PATHS = {
  parcelBookingReports: ['data.*.bookings'],
  parcelReportSerialNo: ['data.*.bookings'],
  allParcelBookingReport: ['data.*.bookings'],
  parcelCancelReport: ['data'], parcelBookingSummaryReport: ['data'],
  parcelBookingMobileNumber: ['data'], regularCustomerBooking: ['data'],
  branchWiseCollectionReport: ['branches'], collectionforSummaryReport: ['branches'],
  collectionReportToPay: ['branches'], allCollectionReport: ['branches'],
  bookingTypeWiseCollection: ['data'], parcelBranchConsolidatedReport: ['data'],
  deliveryReport: ['data'], senderReceiverGSTReport: ['bookings'],
  parcelStatusDateDifferenceReport: ['data'], pendingDeliveryStockReport: ['data.formattedBookings'],
  pendingDeliveryLuggageReport: ['data.formattedDeliveries'], parcelReceivedStockReport: ['data'],
  deliveredStockReport: ['data.deliveries'], pendingDispatchStockReport: ['bookings'],
  dispatchedMemoReport: ['data.*'], parcelIncomingLuggagesReport: ['data'],
  salesSummaryByBranchWise: ['$'], collectionSummaryReport: ['summary'],
  branchAccount: ['branchwise'], acPartyAccount: ['parties'], statusWiseSummary: ['branchwiseStatus'],
  consolidatedReportBranch: ['BookingTypes.*'],
  getBookingsBetweenDates: ['$'], getBookingsByDateAndBranch: ['$'],
  parcelOfflineReport: ['data'], parcelStatusReport: ['data'], parcelPendingReport: ['data'],
  offlineParcelVoucherDetails: ['$'], dispatchedStockReport: ['data'],
  getParcelsLoading: ['data'], getParcelsByFilters: ['data'], getUnloadingReport: ['data'],
  parcelBranchToBranchUnloading: ['$'], voucherDetails: ['data'],
  creditForVoucherGenerate: ['$'],
};

const SUMMARY_REPORTS = new Set([
  'branchWiseCollectionReport', 'collectionforSummaryReport', 'collectionReportToPay',
  'allCollectionReport', 'bookingTypeWiseCollection', 'parcelBranchConsolidatedReport',
  'salesSummaryByBranchWise', 'collectionSummaryReport', 'branchAccount', 'acPartyAccount',
  'statusWiseSummary',
]);
function summaryKey(row) {
  const identity = row?._id ?? row?.branchUniqueId ?? row?.branchName ?? row?.branch ?? row?.city ?? row?.name ?? row?.senderName ?? row?.bookingType ?? '';
  return JSON.stringify(identity) + ':' + JSON.stringify(row);
}

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === null) return fallback;
  if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new ApiError(400, `${name} must be a positive integer`);
  }
  return Number(value);
}

export function getReportPagination(req) {
  const page = positiveInteger(req.query?.page ?? req.body?.page, 1, 'page');
  const limit = Math.min(positiveInteger(req.query?.limit ?? req.body?.limit, 25, 'limit'), 100);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) throw new ApiError(400, 'page is too large');
  return { page, limit, skip };
}

export function paginationMetadata(options, totalRecords, returnedRecords) {
  const { page, limit } = options;
  const totalPages = Math.ceil(totalRecords / limit);
  return {
    page, limit, totalRecords, totalPages, returnedRecords,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1 && totalPages > 0,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 && totalPages > 0 ? Math.min(page - 1, totalPages) : null,
  };
}

export const prepareReportPagination = (req, res, next) => {
  try { getReportPagination(req); validateReportInput(req); next(); }
  catch (error) { return res.status(400).json({ message: error.message }); }
};

function listReferences(holder, key, segments, references, path) {
  if (!segments.length) {
    if (Array.isArray(holder[key])) references.push({ holder, key, path });
    return;
  }
  const current = holder[key];
  if (!current || typeof current !== 'object') return;
  const [segment, ...rest] = segments;
  const keys = segment === '*' ? Object.keys(current).sort(Array.isArray(current) ? (a, b) => Number(a) - Number(b) : undefined) : [segment];
  for (const child of keys) listReferences(current, child, rest, references, path ? `${path}.${child}` : child);
}

// Paginate legacy computed/grouped reports after their full-result totals are calculated.
// A single window spans the detail lists, in deterministic group-key order.
export function paginateReportPayload(payload, name, options) {
  const holder = { payload: Array.isArray(payload) ? { data: payload } : { ...payload } };
  // Clone only report containers; never clone or paginate a row's packages.
  function cloneContainers(value, segments) {
    if (!value || typeof value !== 'object' || !segments.length) return;
    const [key, ...rest] = segments;
    for (const child of key === '*' ? Object.keys(value) : [key]) {
      if (value[child] && typeof value[child] === 'object') {
        value[child] = Array.isArray(value[child]) ? [...value[child]] : { ...value[child] };
        cloneContainers(value[child], rest);
      }
    }
  }
  const paths = REPORT_PATHS[name] || ['data'];
  const references = [];
  for (const pattern of paths) {
    const segments = (pattern === '$' ? 'data' : pattern).split('.');
    cloneContainers(holder.payload, segments);
    listReferences(holder, 'payload', segments, references, '');
  }
  let offset = 0;
  let returnedRecords = 0;
  for (const { holder: container, key } of references) {
    const rows = SUMMARY_REPORTS.has(name)
      ? [...container[key]].sort((a, b) => summaryKey(a) < summaryKey(b) ? -1 : summaryKey(a) > summaryKey(b) ? 1 : 0)
      : container[key];
    const start = Math.max(0, options.skip - offset);
    const end = Math.max(0, Math.min(rows.length, options.skip + options.limit - offset));
    const pageRows = rows.slice(start, end);
    offset += rows.length;
    container[key] = pageRows;
    returnedRecords += pageRows.length;
  }
  holder.payload.pagination = paginationMetadata(options, offset, returnedRecords);
  if (!references.length) holder.payload.data = [];
  if (name === 'consolidatedReportBranch' && Array.isArray(payload.deliverToPayDetails)) {
    const rows = payload.deliverToPayDetails;
    holder.payload.deliverToPayDetails = rows.slice(options.skip, options.skip + options.limit);
    holder.payload.pagination.sections = {
      deliverToPayDetails: paginationMetadata(options, rows.length, holder.payload.deliverToPayDetails.length),
    };
  }
  return holder.payload;
}

export function sendReport(req, res, payload, name) {
  return res.status(200).json(paginateReportPayload(payload, name, getReportPagination(req)));
}

export function sendEmptyReport(req, res, payload) {
  return res.status(200).json({ ...payload, success: true, data: [], pagination: paginationMetadata(getReportPagination(req), 0, 0) });
}

// Page raw records in MongoDB; totals aggregate the full filter independently.
export async function queryReportPage(query, req, sums = {}) {
  const options = getReportPagination(req);
  const Model = query.model;
  const filter = Model.find(query.getFilter()).cast(Model);
  const sort = query.getOptions().sort || { createdAt: -1 };
  query.sort({ ...sort, _id: sort._id || Object.values(sort)[0] || -1 });
  const metrics = Object.fromEntries(Object.entries(sums).map(([name, expression]) => [name, { $sum: expression }]));
  const [rows, summary] = await Promise.all([
    query.skip(options.skip).limit(options.limit).lean(),
    Model.aggregate([{ $match: filter }, { $group: { _id: null, totalRecords: { $sum: 1 }, ...metrics } }]),
  ]);
  const totals = summary[0] || Object.fromEntries(['totalRecords', ...Object.keys(sums)].map(key => [key, 0]));
  return { rows, totals, pagination: paginationMetadata(options, totals.totalRecords, rows.length) };
}

export function sendReportPage(res, payload, pagination) {
  return res.status(200).json({ ...(pagination?.totalRecords === 0 ? { data: [] } : {}), ...(Array.isArray(payload) ? { data: payload } : payload), pagination });
}

export async function queryGroupedReportPage(Model, filter, types, req, { select, populate, direction = 1 } = {}) {
  const options = getReportPagination(req);
  const groups = [...new Set(types)].sort();
  if (groups.some(type => !['paid', 'credit', 'toPay', 'FOC', 'CLR'].includes(type))) throw new ApiError(400, 'Invalid bookingType');
  const match = Model.find({ ...filter, bookingType: { $in: groups } }).cast(Model);
  let query = Model.find(match).sort({ bookingType: 1, bookingDate: direction, _id: direction }).skip(options.skip).limit(options.limit).select(select);
  if (populate) query = query.populate(populate);
  const [rows, summaries] = await Promise.all([
    query.lean(),
    Model.aggregate([{ $match: match }, { $group: {
      _id: '$bookingType', count: { $sum: 1 }, allGrandTotal: { $sum: '$grandTotal' },
      allTotalPackages: { $sum: '$totalPackages' }, allTotalQuantity: { $sum: '$totalQuantity' },
    } }]),
  ]);
  const summaryByType = new Map(summaries.map(row => [row._id, row]));
  const data = Object.fromEntries(groups.map(type => [type, {
    bookings: [], allGrandTotal: summaryByType.get(type)?.allGrandTotal || 0,
    allTotalPackages: summaryByType.get(type)?.allTotalPackages || 0,
    allTotalQuantity: summaryByType.get(type)?.allTotalQuantity || 0,
  }]));
  for (const row of rows) data[row.bookingType].bookings.push(row);
  const totalRecords = summaries.reduce((sum, row) => sum + row.count, 0);
  return { data, pagination: paginationMetadata(options, totalRecords, rows.length) };
}
