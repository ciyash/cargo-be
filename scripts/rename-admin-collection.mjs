import 'dotenv/config';
import mongoose from 'mongoose';
import {createHash} from 'node:crypto';

// Explicit, reversible collection rename. Never overwrite an existing target.
const source=process.argv.includes('--rollback')?'Admin':'subadmins';
const target=process.argv.includes('--rollback')?'subadmins':'Admin';
async function fingerprint(collection){
 const hash=createHash('sha256');let count=0;
 for await(const row of collection.find({},{projection:{_id:1}}).sort({_id:1})) {hash.update(String(row._id)+'\n');count++;}
 return {count,ids:hash.digest('hex'),indexes:await collection.indexes()};
}
try{
 await mongoose.connect(process.env.MONGO_URI,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:10000});
 const db=mongoose.connection.db;
 const names=(await db.listCollections({},{nameOnly:true}).toArray()).map(row=>row.name);
 if(!names.includes(source))throw Error('Source collection does not exist; no changes made');
 if(names.includes(target))throw Error('Target collection already exists; no changes made');
 const before=await fingerprint(db.collection(source));
 console.log(JSON.stringify({source,target,records:before.count,ready:true,apply:process.argv.includes('--apply')}));
 if(process.argv.includes('--apply')){
  await db.collection(source).rename(target,{dropTarget:false});
  const after=await fingerprint(db.collection(target));
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Post-rename verification differs; inspect the collection before continuing');
  console.log(JSON.stringify({renamed:true,recordsPreserved:true,indexesPreserved:true,records:after.count}));
 }
}catch(error){console.error('Admin collection rename failed: '+(error.name==='MongooseServerSelectionError'?'Database connection unavailable':String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g,'[redacted connection]')));process.exitCode=1;}
finally{await mongoose.disconnect();}
