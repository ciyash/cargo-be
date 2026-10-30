import CFVoucher from '../models/cf.voucher.generate.model.js';
import { Booking } from '../models/booking.model.js';
import { ApiError } from '../utils/api-error.js';
import { nextSequence } from './sequence.js';

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
      const groups = new Map();
      for (const booking of bookings) {
        if (!groups.has(booking.agent)) groups.set(booking.agent, []);
        groups.get(booking.agent).push(booking);
      }
      const last = await CFVoucher.findOne({ companyId: user.companyId }).sort({ voucherNo: -1 }).select('voucherNo').session(session).lean();
      const end = await nextSequence(`cfvoucher:${user.companyId}`, last?.voucherNo || 99, groups.size);
      let voucherNo = end - groups.size;
      const vouchers = [...groups.entries()].map(([agent, rows]) => ({
        companyId: user.companyId, voucherNo: ++voucherNo, grnNo: rows.map(b => b.grnNo), lrNumber: rows.map(b => b.lrNumber),
        creditForAgent: agent, fromBranch: rows[0].pickUpBranchname, toBranch: rows[0].dropBranchname,
        consignor: rows[0].senderName, bookingStatus: 1, charge: rows.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0),
      }));
      const created = await CFVoucher.insertMany(vouchers, { session });
      const result = await Booking.updateMany({ ...filter, status: { $ne: true } }, { $set: { status: true } }, { session });
      if (result.matchedCount !== grns.length) throw new ApiError(409, 'Bookings changed during voucher creation; retry');
      return created;
    });
  } finally { await session.endSession(); }
}
