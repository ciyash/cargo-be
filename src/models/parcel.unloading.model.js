import mongoose from "mongoose";
import { legacyDataScopePlugin } from '../services/legacy-data-scope.js';

const unloadingSchema=new mongoose.Schema({
    // auto filled
    unLoadingBy:{type:mongoose.Schema.Types.ObjectId,ref:"Admin",required:function(){return !this.unLoadingByCompany;}},  //auto fill
    unLoadingByCompany:{type:mongoose.Schema.Types.ObjectId,ref:'Company'},
    companyId: {type: mongoose.Schema.Types.ObjectId,ref: "Company", required: true}, //auto fill
    unLoadingVoucher:{type:Number,required:true},  // auto generated
    unloadingDate:{type:Date,default:()=>new Date()},   // auto filled
    bookingStatus:{type:String,default:null},

    bookingType:{type:String,default:""},
    branch: { type: String },
    fromCity: { type: String },
    toCity: { type: String },
    vehicleNo:{type:String,required:false},
    lrNumber:[{type:String,required:true}],
    grnNo:[{type:Number,required:true}],
    unloadBranch:{type:String},
    remarks:{type:String},
})

unloadingSchema.index({ companyId: 1, unloadingDate: -1 });
unloadingSchema.index({ companyId: 1, unLoadingVoucher: 1 });
unloadingSchema.plugin(legacyDataScopePlugin,{kind:'unloading'});
export default mongoose.model("ParcelUnloading",unloadingSchema)
