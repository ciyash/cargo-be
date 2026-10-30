import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Company from '../models/company.model.js';
import Branch from '../models/branch.model.js';
import { Booking } from '../models/booking.model.js';

const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const cookieName = 'cargo_owner';
const cookieOptions = () => ({ httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api/owner', maxAge: 3600000 });
const configured = () => process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD_HASH && process.env.OWNER_SECRET?.length >= 32;
const attempts = new Map();
router.post('/login', async (req, res, next) => {
  if (!configured()) return res.status(503).json({ message: 'Owner access has not been configured' });
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = req.ip;
  const attempt = attempts.get(key) || { count: 0, until: now + 900000 };
  if (attempt.count >= 5) return res.status(429).json({ message: 'Too many attempts. Try again in 15 minutes.' });
  attempt.count++; attempts.set(key, attempt);
  try {
    const { email, password } = req.body;
    const validPassword = typeof password === 'string' && password.length <= 1024 && await bcrypt.compare(password, process.env.OWNER_PASSWORD_HASH);
    if (typeof email !== 'string' || email.trim().toLowerCase() !== process.env.OWNER_EMAIL.toLowerCase() || !validPassword) return res.status(401).json({ message: 'Invalid owner credentials' });
    attempts.delete(key);
    const token = jwt.sign({ role: 'platform-owner', sub: process.env.OWNER_EMAIL }, process.env.OWNER_SECRET, { expiresIn: '1h', audience: 'cargo-owner', issuer: 'cargo-platform' });
    res.cookie(cookieName, token, cookieOptions()).json({ email: process.env.OWNER_EMAIL });
  } catch (error) { next(error); }
});

export function ownerAuth(req, res, next) {
  if (!configured()) return res.status(503).json({ message: 'Owner access has not been configured' });
  try {
    const token = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    const user = jwt.verify(token || '', process.env.OWNER_SECRET, { algorithms: ['HS256'], audience: 'cargo-owner', issuer: 'cargo-platform' });
    if (user.role !== 'platform-owner' || user.sub !== process.env.OWNER_EMAIL) throw new Error('Invalid role');
    next();
  } catch { res.status(401).json({ message: 'Owner login required' }); }
}
router.use(ownerAuth);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/session', (req, res) => res.json({ email: process.env.OWNER_EMAIL }));
router.post('/logout', (req, res) => res.clearCookie(cookieName, { ...cookieOptions(), maxAge: undefined }).json({ message: 'Signed out' }));

router.get('/reports', async (req, res, next) => {
  try {
    const now = new Date();
    for (const key of ['from', 'to']) {
      if (req.query[key] !== undefined && (typeof req.query[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(req.query[key]) || !Number.isFinite(Date.parse(req.query[key])) || new Date(req.query[key]).toISOString().slice(0, 10) !== req.query[key])) return res.status(400).json({ message: 'Dates must be valid YYYY-MM-DD values' });
    }
    for (const key of ['from', 'to']) {
      if (req.query[key] !== undefined && (typeof req.query[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(req.query[key]) || !Number.isFinite(Date.parse(req.query[key])) || new Date(req.query[key]).toISOString().slice(0, 10) !== req.query[key])) return res.status(400).json({ message: 'Dates must be valid YYYY-MM-DD values' });
    }
    const start = req.query.from ? new Date(`${req.query.from}T00:00:00.000Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = req.query.to ? new Date(`${req.query.to}T23:59:59.999Z`) : now;
    if (![start, end].every(date => Number.isFinite(date.getTime())) || start > end || end - start > 366 * 86400000) return res.status(400).json({ message: 'Choose a valid date range of up to 366 days' });
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const filter = {};
    if (search) filter.$or = ['name', 'email'].map(field => ({ [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }));
    if (req.query.status === 'blocked') filter.isBlocked = true;
    if (req.query.status === 'active') { filter.isBlocked = { $ne: true }; filter['subscription.validTill'] = { $gt: now }; }
    if (req.query.status === 'expired') { filter.isBlocked = { $ne: true }; filter.$and = [{ $or: [{ 'subscription.validTill': { $lte: now } }, { 'subscription.validTill': null }] }]; }
    const [summary, trends, usage, companies, total, branches] = await Promise.all([
      Company.aggregate([{ $group: { _id: null, total: { $sum: 1 }, independent: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$parentCompany', null] }, null] }, 1, 0] } }, blocked: { $sum: { $cond: ['$isBlocked', 1, 0] } }, active: { $sum: { $cond: [{ $and: [{ $ne: ['$isBlocked', true] }, { $gt: ['$subscription.validTill', now] }] }, 1, 0] } }, registrations: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', start] }, { $lte: ['$createdAt', end] }] }, 1, 0] } } } }]),
      Company.aggregate([{ $match: { createdAt: { $gte: start, $lte: end } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Booking.aggregate([{ $match: { bookingDate: { $gte: start, $lte: end } } }, { $group: { _id: null, bookings: { $sum: 1 }, freightValue: { $sum: '$grandTotal' } } }]),
      Company.find(filter).select('name email phone state parentCompany isBlocked subscription createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(),
      Company.countDocuments(filter), Branch.countDocuments({})
    ]);
    const ids = companies.map(company => company._id);
    const [companyBookings, companyBranches] = await Promise.all([
      Booking.aggregate([{ $match: { companyId: { $in: ids }, bookingDate: { $gte: start, $lte: end } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }]),
      Branch.aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }])
    ]);
    const counts = rows => new Map(rows.map(row => [String(row._id), row.count]));
    const bookingCounts = counts(companyBookings), branchCounts = counts(companyBranches);
    res.json({ generatedAt: now, range: { from: start, to: end, timezone: 'UTC' }, summary: { total: 0, independent: 0, active: 0, blocked: 0, registrations: 0, ...summary[0], branches, bookings: usage[0]?.bookings || 0, freightValue: usage[0]?.freightValue || 0 }, trends, companies: companies.map(company => ({ ...company, status: company.isBlocked ? 'blocked' : new Date(company.subscription?.validTill || 0) > now ? 'active' : 'expired', bookings: bookingCounts.get(String(company._id)) || 0, branches: branchCounts.get(String(company._id)) || 0 })), pagination: { page, pageSize: 25, total, pages: Math.ceil(total / 25) } });
  } catch (error) { next(error); }
});
export default router;
