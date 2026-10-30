import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }, 
    employeeId: { type: String, required: true }, 
    mobile: { type: String, required: true },  // Changed to String for safety
    branch: { type: String, required: true }, 
    state: { type: String, required: true },  
    pincode: { type: String, required: true },  // Changed to String to prevent data loss
    country: { type: String, required: true },  
    alternateMobile: { type: String },  // Changed to String for consistency
    status: { type: Boolean, required: true, default: false } 
});

export default mongoose.model("Branch", branchSchema);
