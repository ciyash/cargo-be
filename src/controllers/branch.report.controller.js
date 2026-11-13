import mongoose from 'mongoose';
import Branch from '../models/branch.model.js';
import { BranchDailySnapshot } from '../models/expensive.model.js';
import { ApiError, sendError } from '../utils/api-error.js';
import { branchMovements } from '../services/branch-balance.js';
import { companyAdmin } from '../services/roles.js';
import { reportDayStart } from '../utils/report-input.js';

async function liveSnapshot(companyId, branchCode, user) {
  if (!companyId) throw new ApiError(401, 'Company ID missing');
  if (user && !companyAdmin(user) && user.branchId !== branchCode) throw new ApiError(403, 'Use your assigned branch');
  const branch = await Branch.findOne({ companyId, branchUniqueId: branchCode }).lean();
  if (!branch) throw new ApiError(404, 'Branch not found');
  const now = new Date();
  const today = reportDayStart(new Date(now.getTime()+330*60000).toISOString().slice(0,10));
  const company = new mongoose.Types.ObjectId(companyId);
  const [prior, current] = await Promise.all([
    branchMovements(company, branch, { $lt: today }),
    branchMovements(company, branch, { $gte: today, $lte: now }),
  ]);
  const openingBalance = Math.round((Number(branch.openingBalance || 0) + prior.income - prior.expenses) * 100) / 100;
  const { income, expenses } = current;
  return { success: true, branchCode, date: today, time: now, openingBalance, income, expenses, reversals: current.reversals, closingBalance: Math.round((openingBalance + income - expenses) * 100) / 100 };
}
const getLiveBranchSnapshot = async (req, res) => {
  try { return res.status(200).json(await liveSnapshot(req.user?.companyId, req.params.branchCode, req.user)); }
  catch (error) { return sendError(res, error); }
};
const getLiveStatus = async (req, res) => {
  try {
    const data = await liveSnapshot(req.user?.companyId, req.params.branchCode, req.user);
    return res.status(200).json({ success: true, branchCode: data.branchCode, income: data.income, expenses: data.expenses, liveBalance: data.income - data.expenses });
  } catch (error) { return sendError(res, error); }
};
// Explicit request handler only; scheduling needs a company-aware caller.
const createDailyBranchSnapshot = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) throw new ApiError(401, 'Company ID missing');
    const cursor = Branch.find({ companyId, ...(!companyAdmin(req.user) ? {branchUniqueId:req.user.branchId||'__unassigned__'} : {}) }).select('branchUniqueId').lean().cursor();
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
