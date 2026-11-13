import { ApiError } from '../utils/api-error.js';

export const CHARGE_FIELDS = ['serviceCharges', 'hamaliCharges', 'doorDeliveryCharges', 'doorPickupCharges', 'parcelGstAmount'];
export function money(value, label = 'amount') {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') throw new ApiError(400, `Invalid ${label}`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100000000) throw new ApiError(400, `Invalid ${label}`);
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
export function calculateBooking(input) {
  if (!['paid', 'toPay', 'credit', 'FOC'].includes(input.bookingType)) throw new ApiError(400, 'Invalid freight type');
  if (!Array.isArray(input.packages) || !input.packages.length || input.packages.length > 1000) throw new ApiError(400, 'Provide 1–1000 packages');
  const packages = input.packages.map(p => {
    if (!p || !['number', 'string'].includes(typeof p.quantity) || !Number.isSafeInteger(Number(p.quantity)) || Number(p.quantity) < 1 || Number(p.quantity) > 1000) throw new ApiError(400, 'Package quantity must be a positive integer, at most 1000');
    const quantity = Number(p.quantity), unitPrice = money(p.unitPrice, 'package price');
    return { ...p, quantity, unitPrice, totalPrice: money(quantity * unitPrice, 'package total') };
  });
  const charges = Object.fromEntries(CHARGE_FIELDS.map(k => [k, money(input[k] ?? 0, k)]));
  const totalCharge = money(packages.reduce((sum, p) => sum + p.totalPrice, 0), 'freight total');
  const grandTotal = input.bookingType === 'FOC' ? 0 : money(totalCharge + Object.values(charges).reduce((sum, n) => sum + n, 0), 'booking total');
  return { packages, ...charges, totalCharge, grandTotal, totalPackages: packages.length, totalQuantity: packages.reduce((sum, p) => sum + p.quantity, 0) };
}

// Financial changes require a dedicated, reconciled workflow, not a generic edit.
const financial = new Set(['packages', 'bookingType', 'agent', 'grandTotal', 'totalPrice', 'totalCharge', 'totalPackages', 'totalQuantity', 'toPayDeliveredAmount', 'refundAmount', 'status', ...CHARGE_FIELDS]);
const editable = new Set(['senderName', 'senderMobile', 'senderAddress', 'senderGst', 'receiverName', 'receiverMobile', 'receiverAddress', 'receiverGst', 'receiverEmail', 'receiverState', 'remarks']);
export function bookingEdits(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'Provide booking details');
  if (Object.keys(input).some(k => financial.has(k))) throw new ApiError(409, 'Freight, payment and statement fields cannot be changed through a general edit');
  const result = Object.fromEntries(Object.entries(input).filter(([k]) => editable.has(k)));
  if (!Object.keys(result).length) throw new ApiError(400, 'No editable contact details or remarks provided');
  return result;
}
