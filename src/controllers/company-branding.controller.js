import Company from '../models/company.model.js';
import { publicBranding } from '../utils/company-branding.js';
export async function getCompanyBranding(req, res, next) {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.companyId)) return res.status(400).json({ message: 'Invalid company login link' });
    const company = await Company.findOne({ _id: req.params.companyId, isBlocked: { $ne: true } }).select('_id name logoText').lean();
    if (!company) return res.status(404).json({ message: 'Company login link is unavailable' });
    res.set('Cache-Control', 'no-store').json(publicBranding(company));
  } catch (error) { next(error); }
}
