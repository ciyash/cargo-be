import mongoose from 'mongoose';
const companyId = { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true };
const eventSchema = new mongoose.Schema({ companyId, bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, kind: { type: String, enum: ['reserve','consume','release','restore','allocate','purchase','grant'], required: true }, count: { type: Number, required: true }, amount: { type: Number, default: 0 }, reference: String, actor: String, operationKey: { type: String, required: true } }, { timestamps: true });
eventSchema.index({ companyId: 1, operationKey: 1 }, { unique: true });
const connection = new mongoose.Schema({ companyId, providerKey: { type: String, required: true }, enabled: { type: Boolean, default: false }, connected: { type: Boolean, default: false }, credentials: { type: String, select: false }, accountLabel: String, pickupLocation: String, walletBalance: Number, walletCurrency: String, walletSyncedAt: Date, token: { type: String, select: false }, tokenExpiresAt: Date }, { timestamps: true });
connection.index({ companyId: 1, providerKey: 1 }, { unique: true });
connection.add({environment:{type:String,enum:['staging','production']},clientName:String,sellerGst:String});
export const QuotaEvent = mongoose.model('QuotaEvent', eventSchema);
export const CourierConnection = mongoose.model('CourierConnection', connection);
