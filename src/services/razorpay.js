import axios from 'axios';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Company from '../models/company.model.js';
import Payment from '../models/payment.model.js';
import { ApiError } from '../utils/api-error.js';
import { PRICE_PAISE } from './billing.js';
import { CourierConnection, QuotaEvent } from '../models/logistics.model.js';
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
  if (payment.order_id !== order.orderId || payment.amount !== (order.amount ?? PRICE_PAISE) || payment.currency !== (order.currency || 'INR') || payment.status !== 'captured' || payment.refunded || payment.amount_refunded > 0) throw new ApiError(409, 'Payment is not captured for this order and amount');
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
      if(order.purpose==='service') {
        if(!order.providerKey)throw new ApiError(409,'Service order has no provider');
        await CourierConnection.updateOne({companyId:company._id,providerKey:order.providerKey},{$set:{enabled:true}},{upsert:true,session});
      } else {
        if(!Number.isSafeInteger(order.bookings)||order.bookings<1)throw new ApiError(409,'Legacy payment needs reviewed booking-pack migration; no unlimited plan is activated');
        await Company.updateOne({_id:company._id},{$inc:{'bookingQuota.purchased':order.bookings,'bookingQuota.revision':1},$set:{companyAccess:true}},{session});
        await QuotaEvent.create([{companyId:company._id,kind:'purchase',count:order.bookings,amount:order.amount/100,reference:order.orderId,operationKey:`payment:${order.orderId}`}],{session});
      }
      Object.assign(order, { status: 'paid', paymentId: payment.id, paidAt: now });
      return order.save({ session });
    });
  } finally { await session.endSession(); }
}
