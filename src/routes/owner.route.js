import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ownerReport } from '../services/owner-report.js';

const router = express.Router();
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

router.get('/reports', async (req,res,next) => {
  try { res.json(await ownerReport(req.query)); } catch(error) { next(error); }
});
export default router;
