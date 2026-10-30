import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  orderId: { type: String, required: true, unique: true },
  paymentId: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['created', 'paid'], default: 'created' },
  paidAt: Date,
  validTill: Date,
}, { timestamps: true });
export default mongoose.model('PlatformPayment', schema);
