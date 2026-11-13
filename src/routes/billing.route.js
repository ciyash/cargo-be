import express from 'express';
import { randomUUID } from 'node:crypto';
import companyAuth from "../middleware/company.auth.js";
import staffAuth from "../middleware/auth.middleware.js";
import Company from '../models/company.model.js';
import Payment from '../models/payment.model.js';
import { billingStatus, bookingPack } from '../services/billing.js';
import { providerCatalog } from '../services/couriers.js';
import { activatePayment, razorpayConfigured, razorpayRequest, signatureValid } from '../services/razorpay.js';
import { ApiError } from '../utils/api-error.js';
const router = express.Router();
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const status = handle(async (req, res) => {
  res.json({ ...await billingStatus(req.user.companyId,req.user.branchId), checkoutConfigured: razorpayConfigured(), canPay: ['company','company_admin'].includes(req.user.role), testMode: process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') !== false });
});
router.get('/status', companyAuth, status);
router.get('/staff-status', staffAuth, status);
router.use(companyAuth);
router.get('/history', handle(async (req, res) => {
  res.json(await Payment.find({ companyId: req.user.companyId }).select('orderId amount currency status paidAt purpose bookings providerKey createdAt').sort({ createdAt: -1 }).limit(50).lean());
}));
router.post('/orders', handle(async (req, res) => {
  const company = await Company.findById(req.user.companyId).lean();
  if (!company) throw new ApiError(404, 'Company not found');
  if (company.isBlocked) throw new ApiError(403, 'Company is blocked');
  const purpose=req.body.purpose||'booking-pack';
  if(!['booking-pack','service'].includes(purpose))throw new ApiError(400,'Invalid payment purpose');
  const pack=bookingPack(),service=purpose==='service'?providerCatalog().find(p=>p.key===req.body.providerKey&&p.implemented):null;
  if(purpose==='service'&&!service?.fee)throw new ApiError(422,'Service enablement fee is not configured');
  const amount=purpose==='service'?service.fee:pack.amount;
  const order = await razorpayRequest('POST', 'orders', { amount, currency: 'INR', receipt: randomUUID() });
  if (order.amount !== amount || order.currency !== 'INR' || !/^order_[a-zA-Z0-9]+$/.test(order.id)) throw new ApiError(502, 'Invalid order received from payment provider');
  await Payment.create({ companyId: company._id, orderId: order.id, amount, purpose,bookings:purpose==='booking-pack'?pack.bookings:0,providerKey:service?.key });
  res.status(201).json({ orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID, amount, currency: 'INR', companyName: company.name, email: company.email,purpose,bookings:purpose==='booking-pack'?pack.bookings:0 });
}));
router.post('/verify', handle(async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (typeof orderId !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(orderId) || typeof paymentId !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(paymentId)) throw new ApiError(400, 'Invalid payment identifiers');
  const order = await Payment.findOne({ orderId, companyId: req.user.companyId }).lean();
  if (!order) throw new ApiError(404, 'Payment order not found');
  if (!razorpayConfigured() || !signatureValid(`${order.orderId}|${paymentId}`, signature, process.env.RAZORPAY_KEY_SECRET)) throw new ApiError(400, 'Invalid payment signature');
  const payment = await razorpayRequest('GET', `payments/${paymentId}`);
  const result = await activatePayment(order.orderId, payment);
  res.json({ message: result.purpose==='service'?'Service enabled':'Booking quota added', bookings:result.bookings });
}));
router.post('/reconcile', handle(async (req, res) => {
  const { orderId } = req.body;
  if (typeof orderId !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(orderId)) throw new ApiError(400, 'Invalid order');
  const order = await Payment.findOne({ orderId, companyId: req.user.companyId }).lean();
  if (!order) throw new ApiError(404, 'Payment order not found');
  const result = await razorpayRequest('GET', `orders/${order.orderId}/payments`);
  const captured = result.items?.find(payment => payment.status === 'captured');
  if (!captured) throw new ApiError(409, 'Payment has not been captured yet. Please retry later.');
  const paid = await activatePayment(order.orderId, captured);
  res.json({ message: 'Payment confirmed', validTill: paid.validTill });
}));
export const paymentWebhook = handle(async (req, res) => {
  if (!razorpayConfigured() || !process.env.RAZORPAY_WEBHOOK_SECRET || /dummy|replace/i.test(process.env.RAZORPAY_WEBHOOK_SECRET)) throw new ApiError(503, 'Webhook not configured');
  if (!signatureValid(req.body, req.get('x-razorpay-signature'), process.env.RAZORPAY_WEBHOOK_SECRET)) throw new ApiError(400, 'Invalid webhook signature');
  const event = JSON.parse(req.body.toString('utf8'));
  if (['payment.captured', 'order.paid'].includes(event.event)) {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && await Payment.exists({ orderId: payment.order_id })) {
      const confirmed = await razorpayRequest('GET', `payments/${encodeURIComponent(payment.id)}`);
      await activatePayment(payment.order_id, confirmed);
    }
  }
  res.json({ received: true });
});
export default router;
