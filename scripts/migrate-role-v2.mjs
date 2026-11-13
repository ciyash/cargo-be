import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {planRoleMigration} from "../src/services/role-migration-plan.js";
const fingerprint=rows=>createHash('sha256').update(JSON.stringify(rows.map(row=>{const copy={...row};delete copy.role;delete copy.roleVersion;return copy;}).sort((a,b)=>String(a._id).localeCompare(String(b._id))))).digest('hex');
try{
 await mongoose.connect(process.env.MONGO_URI,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:10000});
 const db=mongoose.connection.db,collection=db.collection('Admin');
 const before=await collection.find({}).sort({_id:1}).toArray();
 const plan=planRoleMigration(before);
 if(!plan.ready)throw Error('Preflight found account/branch issues; no roles changed');
 for(const row of before){const target=plan.changes.find(change=>change.id===String(row._id))?.to||row.role;if(target!=='company_admin'&&!await db.collection('branches').findOne({_id:row.branchId,companyId:row.companyId},{projection:{_id:1}}))throw Error('Assigned branch does not belong to the account company');}
 console.log(JSON.stringify({records:before.length,changes:plan.changes.length,counts:plan.counts,ready:true}));
 if(process.argv.includes('--apply')&&plan.changes.length){
  const directory=path.resolve('.private-db-backups/role-v2');await fs.mkdir(directory,{recursive:true});
  const manifest=path.join(directory,'accounts-'+Date.now()+'.json');
  const backup={createdAt:new Date().toISOString(),collection:'Admin',unchangedDataHash:fingerprint(before),accounts:before.map(row=>({id:String(row._id),role:row.role,hadRoleVersion:Object.hasOwn(row,'roleVersion'),roleVersion:row.roleVersion,branchId:row.branchId?String(row.branchId):null,companyId:String(row.companyId)}))};
  await fs.writeFile(manifest,JSON.stringify(backup,null,2),{flag:'wx'});
  if(JSON.parse(await fs.readFile(manifest,'utf8')).accounts.length!==before.length)throw Error('Rollback manifest verification failed');
  const session=await mongoose.startSession();
  try{await session.withTransaction(async()=>{
   const current=await collection.find({},{session}).sort({_id:1}).toArray();
   if(fingerprint(current)!==fingerprint(before)||current.length!==before.length)throw Error('Accounts changed after preflight; retry migration');
   for(const change of plan.changes){const result=await collection.updateOne({_id:new mongoose.Types.ObjectId(change.id),role:change.from,roleVersion:{$ne:2}},{$set:{role:change.to,roleVersion:2}},{session});if(result.modifiedCount!==1)throw Error('Account role changed concurrently');}
  });}finally{await session.endSession();}
  const after=await collection.find({}).sort({_id:1}).toArray();
  if(fingerprint(after)!==fingerprint(before)||after.length!==before.length||planRoleMigration(after).changes.length)throw Error('Post-migration verification failed; inspect rollback manifest');
  console.log(JSON.stringify({migrated:true,records:after.length,unchangedDataVerified:true,roleCounts:planRoleMigration(after).counts.after,rollbackManifest:path.relative(process.cwd(),manifest)}));
 }else if(!plan.changes.length)console.log('All accounts already use role version 2; no changes required.');
}catch(error){console.error('Role migration failed: '+error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g,'[redacted connection]'));process.exitCode=1;}
finally{await mongoose.disconnect();}
