import mongoose from "mongoose";
import { normalizeRole, roleLabel, permissionsFor } from '../services/roles.js';

const adminSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company", // assuming you have a Company model
      required: true,
    },
    subadminUniqueId: { type: Number, required: true }, //auto generated unique ID
    // branchId: { type: mongoose.Schema.Types.ObjectId,ref:"Branch",required:true},
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: function () {
        return !['company_admin','superadmin'].includes(this.role);
      },
    },

    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    permissions: { type: [String], enum: ['bookings','loading','delivery','accounts','reports','team','settings','subscription','services','branches'], default: undefined },
    role: {
      type: String,
      enum: ['company_admin','admin','staff'],
      required: true,
    },
    roleVersion: {type:Number,default:2},
    isBlocked: {type:Boolean,default:false},
    isBlocked: {type:Boolean,default:false},
    address: { type: String },
    ipAddress: { type: String },
    username: { type: String },
    phone: { type: String },
    location: { type: String },
    documents: [{ type: String }],
    otp: { type: Number },
    otpAttempts: {type:Number,default:0},
    otpExpires: { type: Date },
    print:{type:String,default:""}
  },
  { timestamps: true, collection: "Admin" }
);

adminSchema.set('toJSON', { transform(doc, result) { delete result.password; delete result.otp; delete result.otpExpires; delete result.otpAttempts; result.role=normalizeRole(doc.role);result.roleLabel=roleLabel(doc.role);result.permissions=permissionsFor(doc);return result; } });

// Use the explicit schema collection name to preserve the existing Admin collection.

export default mongoose.model("Admin", adminSchema);
