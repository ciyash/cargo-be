import Company from '../models/company.model.js';
import { Booking } from '../models/booking.model.js';
import { ApiError } from '../utils/api-error.js';
export const FREE_LIMIT = 100;
export const PRICE_PAISE = 100000;
export const PERIOD_MS = 30 * 86400000;
export function entitlement(company, historicalCount = 0, now = new Date()) {
  const used = company.billing?.freeBookingsUsed ?? Math.min(FREE_LIMIT, historicalCount);
  const paid = new Date(company.billing?.paidUntil || 0) > now;
  return { freeLimit: FREE_LIMIT, freeBookingsUsed: used, freeBookingsRemaining: Math.max(0, FREE_LIMIT - used), paid, paidUntil: company.billing?.paidUntil || null, canBook: !company.isBlocked && (paid || used < FREE_LIMIT), blocked: !!company.isBlocked, amount: PRICE_PAISE, currency: 'INR', periodDays: 30 };
}
export async function billingStatus(companyId) {
  const company = await Company.findById(companyId).lean();
  if (!company) throw new ApiError(404, 'Company not found');
  const count = company.billing?.freeBookingsUsed === undefined ? await Booking.countDocuments({ companyId }) : 0;
  return entitlement(company, count);
}
export async function saveBillableBooking(booking) {
  const session = await Company.startSession();
  const data = booking.toObject();
  try {
    return await session.withTransaction(async () => {
      const company = await Company.findById(data.companyId).session(session).lean();
      if (!company) throw new ApiError(404, 'Company not found');
      if (company.isBlocked) throw new ApiError(403, 'Company is blocked');
      const count = company.billing?.freeBookingsUsed === undefined ? await Booking.countDocuments({ companyId: data.companyId }).session(session) : 0;
      const status = entitlement(company, count);
      if (!status.canBook) throw new ApiError(402, 'Your 100 free bookings are complete. Ask your company owner to pay INR 1,000 for 30 days of unlimited bookings.');
      await Company.updateOne({ _id: company._id }, { $set: { 'billing.freeBookingsUsed': status.freeBookingsUsed + (status.paid ? 0 : 1) }, $inc: { 'billing.revision': 1 } }, { session });
      return new Booking(data).save({ session });
    });
  } finally { await session.endSession(); }
}
