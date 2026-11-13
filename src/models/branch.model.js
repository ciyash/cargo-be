import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  branchUniqueId: { type: String, required: true },
  openingBalance: { type: Number, default: 0 },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: function () { return !this.createdByCompany; },
  },
  createdByCompany: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  branchType: { type: String, enum: ["main", "normal"], default: "normal" },
  ownershipType: { type: String, enum: ['own', 'franchise'], default: 'own' },
  servicePostalCodes: [{ type: String, trim: true, maxlength: 20 }],
  franchiseQuota: {
    allocated: { type: Number, min: 0, default: 0 }, used: { type: Number, min: 0, default: 0 },
    held: { type: Number, min: 0, default: 0 }, revision: { type: Number, default: 0 },
  },
  name: { type: String, required: true },
  city: { type: String, required: true },
  cityId:{type:mongoose.Schema.Types.ObjectId,ref:'City'},
  address: { type: String, required: true },
  location: { type: String, required: true },
  phone: { type: Number, required: true },
  pincode: { type: String, required: true },
  courierPickupLocation: { type: String, maxlength: 150 },
  delhiveryPickupLocation: {type:String,trim:true,maxlength:150},
  state: { type: String, required: true },
  country: { type: String, required: true },
  alternateMobile: { type: Number },
  branchDate: { type: Date, default: () => new Date() },
  branchStatus: { type: Number, default: 0 },
});

export default mongoose.model("Branch", branchSchema);
