import axios from 'axios';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Company from '../models/company.model.js';
import Payment from '../models/payment.model.js';
import { ApiError } from '../utils/api-error.js';
import { PRICE_PAISE, PERIOD_MS } from './billing.js';
export const razorpayConfigured = () => !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET && !/dummy|replace|placeholder/i.test(process.env.RAZORPAY_KEY_ID + process.env.RAZORPAY_KEY_SECRET);
export function signatureValid(payload, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256', secret).update(payload).digest(), Buffer.from(signature, 'hex'));
}
export async function razorpayRequest(method, path, data) {
  if (!razorpayConfigured()) throw new ApiError(503, 'Payments are not configured yet. Razorpay dummy keys must be replaced with valid test keys.');
  try {
    const response = await axios({ method, url: 'https://api.razorpay.com/v1/' + path, data, auth: { username: process.env.RAZORPAY_KEY_ID, password: process.env.RAZORPAY_KEY_SECRET }, timeout: 15000 });
    return response.data;
  } catch { throw new ApiError(502, 'Could not confirm payment with Razorpay. Please retry; do not pay again if already charged.'); }
}
export function validateCapturedPayment(payment, order) {
  if (payment.order_id !== order.orderId || payment.amount !== PRICE_PAISE || payment.currency !== 'INR' || payment.status !== 'captured' || payment.refunded || payment.amount_refunded > 0) throw new ApiError(409, 'Payment is not captured for this order and amount');
}
export async function activatePayment(orderId, payment) {
  const session = await Payment.startSession();
  try {
    return await session.withTransaction(async () => {
      const order = await Payment.findOne({ orderId }).session(session);
      if (!order) throw new ApiError(404, 'Payment order not found');
      validateCapturedPayment(payment, order);
      if (order.status === 'paid') return order;
      const company = await Company.findById(order.companyId).session(session);
      if (!company) throw new ApiError(404, 'Company not found');
      const now = new Date();
      const validTill = new Date(Math.max(now.getTime(), new Date(company.billing?.paidUntil || 0).getTime()) + PERIOD_MS);
      await Company.updateOne({ _id: company._id }, { $set: { 'billing.paidUntil': validTill, subscription: { plan: 'monthly', startDate: now, validTill }, companyAccess: true }, $inc: { 'billing.revision': 1 } }, { session });
      Object.assign(order, { status: 'paid', paymentId: payment.id, paidAt: now, validTill });
      return order.save({ session });
    });
  } finally { await session.endSession(); }
}
