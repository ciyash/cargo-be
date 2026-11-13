import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  orderId: { type: String, required: true, unique: true },
  paymentId: String,
  purpose: { type: String, enum: ['booking-pack','service'], default: 'booking-pack' },
  bookings: { type: Number, min: 0, default: 0 }, providerKey: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['created', 'paid'], default: 'created' },
  paidAt: Date,
  validTill: Date,
}, { timestamps: true });
export default mongoose.model('PlatformPayment', schema);
