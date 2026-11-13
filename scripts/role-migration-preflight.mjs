import 'dotenv/config';
import mongoose from 'mongoose';
import {planRoleMigration} from "../src/services/role-migration-plan.js";
// Read-only: no updates, index creation, passwords or tokens are read/output.
try{
 await mongoose.connect(process.env.MONGO_URI,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:10000});
 const accounts=await mongoose.connection.db.collection('Admin').find({},{projection:{_id:1,role:1,branchId:1,roleVersion:1}}).toArray();
 const plan=planRoleMigration(accounts);
 console.log(JSON.stringify({collection:'Admin',records:accounts.length,...plan}));
 if(!plan.ready)process.exitCode=1;
}catch(error){console.error('Role migration preflight failed: '+error.name);process.exitCode=1;}
finally{await mongoose.disconnect();}
