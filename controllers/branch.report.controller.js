import mongoose from 'mongoose';
import Branch from '../models/branch.model.js';
import { Booking } from '../models/booking.model.js';
import { Expense, BranchDailySnapshot } from '../models/expensive.model.js';
import { ApiError, sendError } from '../utils/api-error.js';

async function liveSnapshot(companyId, branchCode) {
  if (!companyId) throw new ApiError(401, 'Company ID missing');
  const branch = await Branch.findOne({ companyId, branchUniqueId: branchCode }).lean();
  if (!branch) throw new ApiError(404, 'Branch not found');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const now = new Date();
  const company = new mongoose.Types.ObjectId(companyId);
  const [lastSnapshot, incomeRows, expenseRows] = await Promise.all([
    BranchDailySnapshot.findOne({ companyId, branchCode, date: { $lt: today } }).sort({ date: -1 }).lean(),
    Booking.aggregate([
      { $match: { companyId: company, pickUpBranch: branchCode, bookingDate: { $gte: today, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    Expense.aggregate([
      { $match: { companyId: company, branchId: { $in: [branchCode, String(branch._id)] }, expenseDate: { $gte: today, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  const openingBalance = lastSnapshot?.closingBalance ?? branch.openingBalance ?? 0;
  const income = incomeRows[0]?.total || 0;
  const expenses = expenseRows[0]?.total || 0;
  return { success: true, branchCode, date: today, time: now, openingBalance, income, expenses, closingBalance: openingBalance + income - expenses };
}
const getLiveBranchSnapshot = async (req, res) => {
  try { return res.status(200).json(await liveSnapshot(req.user?.companyId, req.params.branchCode)); }
  catch (error) { return sendError(res, error); }
};
const getLiveStatus = async (req, res) => {
  try {
    const data = await liveSnapshot(req.user?.companyId, req.params.branchCode);
    return res.status(200).json({ success: true, branchCode: data.branchCode, income: data.income, expenses: data.expenses, liveBalance: data.income - data.expenses });
  } catch (error) { return sendError(res, error); }
};
// Explicit request handler only; scheduling needs a company-aware caller.
const createDailyBranchSnapshot = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) throw new ApiError(401, 'Company ID missing');
    const cursor = Branch.find({ companyId }).select('branchUniqueId').lean().cursor();
    try {
      for await (const branch of cursor) {
        const snapshot = await liveSnapshot(companyId, branch.branchUniqueId);
        const { branchCode, date, openingBalance, income, expenses, closingBalance } = snapshot;
        await BranchDailySnapshot.updateOne({ companyId, branchCode, date }, { $set: { openingBalance, income, expenses, closingBalance } }, { upsert: true, runValidators: true });
      }
    } finally { await cursor.close(); }
    return res.status(201).json({ success: true, message: 'All branch snapshots created successfully' });
  } catch (error) { return sendError(res, error); }
};
export default { createDailyBranchSnapshot, getLiveBranchSnapshot, getLiveStatus };
