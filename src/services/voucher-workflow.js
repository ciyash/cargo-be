import CFVoucher from '../models/cf.voucher.generate.model.js';
import { Booking } from '../models/booking.model.js';
import { ApiError } from '../utils/api-error.js';
import { nextSequence } from './sequence.js';
import { companyAdmin } from './roles.js';
import { withoutLegacyDataScope } from './legacy-data-scope.js';
import { money } from './booking-calculation.js';

export async function createVouchers(body, user) {
  if (!user?.companyId) throw new ApiError(401, 'Company ID missing');
  const input = Array.isArray(body.grnNo) ? body.grnNo : [body.grnNo];
  const grns = input.map(Number);
  if (!grns.length || grns.length > 1000 || grns.some(n => !Number.isSafeInteger(n) || n <= 0) || new Set(grns).size !== grns.length) throw new ApiError(400, 'Provide distinct positive GRNs, at most 1000');
  const session = await CFVoucher.startSession();
  try {
    return await session.withTransaction(async () => {
      const filter = { companyId: user.companyId, grnNo: { $in: grns } };
      const bookings = await Booking.find(filter).session(session).lean();
      if (bookings.length !== grns.length) throw new ApiError(400, 'Some GRNs do not exist under your company');
      if (bookings.some(b => b.status || !b.agent)) throw new ApiError(409, 'Bookings must have an agent and must not already be vouchered');
      if (bookings.some(b => b.bookingType !== 'credit' || b.bookingStatus === 5 || b.confirmationStatus && b.confirmationStatus !== 'confirmed')) throw new ApiError(409, 'Only active confirmed credit bookings can be billed');
      if (!companyAdmin(user) && bookings.some(b => !user.branchId || b.pickUpBranch !== user.branchId)) throw new ApiError(403, 'Generate statements for your booking branch only');
      const groups = new Map();
      for (const booking of bookings) {
        const key = JSON.stringify([booking.agent, booking.pickUpBranch]);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(booking);
      }
      const last = await CFVoucher.findOne({ companyId: user.companyId }).sort({ voucherNo: -1 }).select('voucherNo').session(session).lean();
      const end = await nextSequence(`cfvoucher:${user.companyId}`, last?.voucherNo || 99, groups.size);
      let voucherNo = end - groups.size;
      const vouchers = [...groups.values()].map(rows => ({
        companyId: user.companyId, voucherNo: ++voucherNo, grnNo: rows.map(b => b.grnNo), lrNumber: rows.map(b => b.lrNumber),
        creditForAgent: rows[0].agent, originBranch: rows[0].pickUpBranch, fromBranch: rows[0].pickUpBranchname, toBranch: rows[0].dropBranchname,
        consignor: rows[0].senderName, bookingStatus: 1, charge: money(rows.reduce((sum, b) => sum + money(b.grandTotal,'booking freight'), 0),'statement charge'),
      }));
      const created = await CFVoucher.insertMany(vouchers, { session });
      const result = await Booking.updateMany({ ...filter, status: { $ne: true } }, { $set: { status: true } }, { session });
      if (result.matchedCount !== grns.length) throw new ApiError(409, 'Bookings changed during voucher creation; retry');
      return created;
    });
  } finally { await session.endSession(); }
}

// Keep issued statements and their cancellation history instead of deleting them.
export async function reverseStatementBooking(booking, session) {
  if (!booking.status) return;
  // The booking's origin and state were authorized by the cancellation service.
  // Legacy mixed-origin statements must also be reversible, without exposing them.
  const statements = await withoutLegacyDataScope(() => CFVoucher.find({ companyId: booking.companyId, grnNo: booking.grnNo }).session(session));
  if (!statements.length) throw new ApiError(409, 'Statement history is missing; ask accounts to reconcile before cancelling');
  for (const statement of statements) {
    statement.grnNo = statement.grnNo.filter(n => Number(n) !== Number(booking.grnNo));
    statement.lrNumber = statement.lrNumber.filter(n => n !== booking.lrNumber);
    const charge=money(statement.charge,'statement charge'), reversal=money(booking.grandTotal,'booking freight');
    if(reversal>charge)throw new ApiError(409,'Statement amount is inconsistent; accounts must reconcile before cancellation');
    statement.charge = String(Math.round((charge-reversal)*100)/100);
    (statement.voidedGrnNo ||= []).push(booking.grnNo);
    if (!statement.grnNo.length) statement.statementState = 'void';
    await statement.save({ session });
  }
}
