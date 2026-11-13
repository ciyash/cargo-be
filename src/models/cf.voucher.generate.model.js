import mongoose from "mongoose";
import { legacyDataScopePlugin } from '../services/legacy-data-scope.js';

const cfVoucher=new mongoose.Schema({
    companyId:{type:mongoose.Schema.Types.ObjectId,ref:"Company",required:true},
    voucherNo:{type:Number,required:true},
    grnNo:[{type:Number,required:true}],
    lrNumber:[{type:String,required:true}],
    voucherType:{type:String,enum:["pending","credit","assign"]},
    creditForAgent:{type:String,required:true},
    fromBranch:{type:String,required:true},
    originBranch:{type:String,index:true},
    voidedGrnNo:[Number],
    statementState:{type:String,enum:['issued','void'],default:'issued'},
    toBranch:{type:String,required:true},
    // consignor:{type:String,required:true},
    consignor: { type: String, required: true },
    bookingStatus: { type: Number },
    charge:{type:String,required:true},
    generateDate:{type:Date,default:()=>new Date()}
    
})
cfVoucher.plugin(legacyDataScopePlugin, { kind: 'statement' });
cfVoucher.index({companyId:1,originBranch:1,generateDate:-1});
export default mongoose.model("CFVoucher",cfVoucher)
