import { ApiError } from './api-error.js';

export function phoneNumber(value, label = 'Phone number', international = false) {
  if (!['string', 'number'].includes(typeof value)) throw new ApiError(400, `${label} must contain ${international ? '7–15' : 'exactly 10'} digits`);
  const text = String(value);
  if (!(international ? /^\+?\d{7,15}$/ : /^\d{10}$/).test(text)) throw new ApiError(400, `${label} must contain ${international ? '7–15' : 'exactly 10'} digits`);
  return text;
}

// Flat contact fields only: never inspect passwords, provider payloads or documents.
export function domesticPhoneFields(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  // Branch controllers validate against the selected city's trusted country.
  if (/^\/(?:branch(?:\/|$)|company\/branches(?:\/|$))/.test(req.path||'')) return next();
  try {
    for (const key of ['phone', 'mobile', 'workPhone', 'alternateMobile', 'senderMobile', 'receiverMobile']) {
      const value = req.body?.[key];
      if (value !== undefined && value !== null && value !== '') phoneNumber(value, key);
    }
    next();
  } catch (error) { next(error); }
}
