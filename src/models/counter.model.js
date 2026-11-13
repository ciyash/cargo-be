import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String },
  value: { type: Number, required: true },
}, { versionKey: false });

export default mongoose.model('Counter', counterSchema);
