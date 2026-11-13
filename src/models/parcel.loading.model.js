import mongoose from "mongoose";
import { legacyDataScopePlugin } from '../services/legacy-data-scope.js';


const parcelSchema = new mongoose.Schema({
    // auto filled
    loadingType: { type: String,enum:["offload","branchLoad"], required: true }, // Auto-filled
    vocherNoUnique: { type: Number, required: true }, // Auto-generated
    loadingBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: function(){return !this.loadingByCompany;} }, //auto Loading employee
    loadingByCompany: {type:mongoose.Schema.Types.ObjectId,ref:'Company'},
    loadingDate:{type:Date,default:()=>new Date()},
    companyId: {type: mongoose.Schema.Types.ObjectId,ref: "Company", required: true    },
    bookingStatus:{type:String,default:null},
    // frontend entered
    senderName:{type:String},
    vehicalNumber: { type: String, required: true },
    driverName: { type: String,default:null },
    driverNo: { type: Number, default:null },
    grnNo: [{ type: Number, required: true }],
    lrNumber: [{ type: String, required: true }],
    parcelStatus: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    fromCity: { type: String, required: true },
    toCity: [{ type: String, required: true }],
    fromBranch: { type: String ,required: true },

});

parcelSchema.index({ companyId: 1, loadingDate: -1 });
parcelSchema.index({ companyId: 1, vocherNoUnique: 1 });
parcelSchema.plugin(legacyDataScopePlugin,{kind:'loading'});
export default mongoose.model("ParcelLoading", parcelSchema);
