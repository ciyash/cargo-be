import 'dotenv/config';
import mongoose from 'mongoose';
import Company from "../src/models/company.model.js";
import Branch from "../src/models/branch.model.js";
import { Booking } from "../src/models/booking.model.js";
import { QuotaEvent, CourierConnection } from "../src/models/logistics.model.js";

// Read-only unless the deployer explicitly selects --create-indexes.
try {
  if(!process.env.MONGO_URI)throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:10000});
  const hello=await mongoose.connection.db.admin().command({hello:1});
  if(!hello.setName&&hello.msg!=='isdbgrid')throw new Error('Replica set or sharded MongoDB is required for quota and booking transactions');
  console.log(JSON.stringify({transactionCapable:true,companiesWithoutExplicitQuota:await Company.countDocuments({'bookingQuota.purchased':{$exists:false}}),legacyBookingsWithoutQuotaState:await Booking.countDocuments({quotaStatus:{$exists:false}}),branchesWithoutOwnership:await Branch.countDocuments({ownershipType:{$exists:false}})}));
  for(const model of [Company,Branch,Booking,QuotaEvent,CourierConnection]){
    if(process.argv.includes('--create-indexes'))await model.createIndexes();
    const indexes=await model.collection.indexes().catch(error=>{if(error.code===26)return [];throw error;});
    console.log(JSON.stringify({model:model.modelName,indexes:indexes.map(i=>({key:i.key,unique:!!i.unique})),declared:model.schema.indexes().map(([key,options])=>({key,unique:!!options.unique}))}));
  }
}catch(error){console.error('Logistics preflight failed:',error.name==='MongooseServerSelectionError'?'Database unavailable':error.message);process.exitCode=1;}
finally{await mongoose.disconnect();}
