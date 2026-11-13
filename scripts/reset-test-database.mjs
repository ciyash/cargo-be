// Explicit, backed-up reset of ONE configured database. Default mode only backs up.
import 'dotenv/config';
import { MongoClient, BSON } from 'mongodb';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip, createGunzip } from 'node:zlib';
import path from 'node:path';

const mode=process.argv[2]||'backup';
const option=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;};
const protectedNames=new Set(['admin','local','config']);
const root=path.resolve('.private-db-backups');
const uri=process.env.MONGO_URI;
if(!uri)throw Error('Configured database is missing');
if(!/^[a-f0-9]{64}$/i.test(process.env.COURIER_ENCRYPTION_KEY||''))throw Error('A stable courier encryption key is required for the encrypted backup');
const key=createHash('sha256').update('cargo-db-backup-v1:').update(Buffer.from(process.env.COURIER_ENCRYPTION_KEY,'hex')).digest();
const targetHash=createHash('sha256').update(uri).digest('hex');
const client=new MongoClient(uri,{serverSelectionTimeoutMS:10000});
const regular=async db=>(await db.listCollections({}, {nameOnly:false}).toArray()).filter(c=>c.type==='collection'&&!c.name.startsWith('system.')).sort((a,b)=>a.name.localeCompare(b.name));
const hashFile=async file=>{const hash=createHash('sha256');for await(const bytes of createReadStream(file))hash.update(bytes);return hash.digest('hex');};

async function readBackup(directory,entry,onDocument=async()=>{}){
  const file=path.join(directory,entry.file);
  if(path.basename(entry.file)!==entry.file||await hashFile(file)!==entry.encryptedHash)throw Error('Backup file integrity mismatch');
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(entry.iv,'hex'));
  decipher.setAuthTag(Buffer.from(entry.authTag,'hex'));
  let pending=Buffer.alloc(0),count=0;const hash=createHash('sha256');
  await pipeline(createReadStream(file),decipher,createGunzip(),async function(source){
    for await(const bytes of source){
      hash.update(bytes);pending=Buffer.concat([pending,bytes]);
      while(pending.length>=4){const length=pending.readInt32LE(0);if(length<5||length>16*1024*1024)throw Error('Invalid BSON document in backup');if(pending.length<length)break;
        const document=BSON.deserialize(pending.subarray(0,length),{promoteValues:false,promoteLongs:false,promoteBuffers:false,bsonRegExp:true});await onDocument(document);pending=pending.subarray(length);count++;
      }
    }
  });
  if(pending.length||count!==entry.count||hash.digest('hex')!==entry.plainHash)throw Error('Backup document verification failed');
  return count;
}

async function backup(db){
  await mkdir(root,{recursive:true});
  if(!((await realpath(root)).startsWith((await realpath('.'))+path.sep)))throw Error('Backup directory must stay inside this workspace');
  const directory=path.join(root,new Date().toISOString().replace(/[:.]/g,'-')+'-'+db.databaseName.replace(/[^\w-]/g,'_')+'-'+randomBytes(4).toString('hex'));
  await mkdir(directory);
  const manifest={format:'cargo-encrypted-bson-v1',bsonValuesPreserved:true,database:db.databaseName,targetHash,createdAt:new Date().toISOString(),collections:[],verified:false};
  const collections=await regular(db),session=client.startSession();
  try{
    session.startTransaction({readConcern:{level:'snapshot'}});
    for(const collection of collections){
      const entry={name:collection.name,file:Buffer.from(collection.name).toString('hex')+'.bson.gz.enc',iv:randomBytes(12).toString('hex'),count:0,plainHash:'',indexes:await db.collection(collection.name).listIndexes().toArray()};
      const hash=createHash('sha256'),cipher=createCipheriv('aes-256-gcm',key,Buffer.from(entry.iv,'hex'));
      const cursor=db.collection(collection.name).find({},{session,promoteValues:false,promoteLongs:false,bsonRegExp:true}).sort({_id:1});
      async function* documents(){try{for await(const doc of cursor){const bytes=BSON.serialize(doc);hash.update(bytes);entry.count++;yield bytes;}}finally{await cursor.close();}}
      await pipeline(Readable.from(documents()),createGzip(),cipher,createWriteStream(path.join(directory,entry.file),{flags:'wx'}));
      entry.authTag=cipher.getAuthTag().toString('hex');entry.plainHash=hash.digest('hex');entry.encryptedHash=await hashFile(path.join(directory,entry.file));
      manifest.collections.push(entry);
    }
    await session.commitTransaction();
  }catch(error){if(session.inTransaction())await session.abortTransaction();throw error;}finally{await session.endSession();}
  for(const entry of manifest.collections)await readBackup(directory,entry);
  manifest.verified=true;
  await writeFile(path.join(directory,'manifest.json'),BSON.EJSON.stringify(manifest,null,2),{flag:'wx'});
  console.log(JSON.stringify({mode:'backup',database:db.databaseName,collections:manifest.collections.length,records:manifest.collections.reduce((sum,e)=>sum+e.count,0),verified:true,backupDirectory:directory}));
}

async function loadManifest(db){
  const requested=option('--backup');if(!requested)throw Error('A verified backup directory is required');
  const directory=await realpath(path.resolve(requested));if(!directory.startsWith((await realpath(root))+path.sep))throw Error('Backup must belong to this workspace');
  const manifest=BSON.EJSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));
  if(manifest.format!=='cargo-encrypted-bson-v1'||manifest.bsonValuesPreserved!==true||manifest.verified!==true||manifest.database!==db.databaseName||manifest.targetHash!==targetHash||option('--database')!==db.databaseName)throw Error('Backup database/configuration does not match the requested target');
  for(const entry of manifest.collections)await readBackup(directory,entry);
  return {directory,manifest};
}

async function reset(db){
  if(option('--confirm-full-reset')!==db.databaseName)throw Error('Explicit full database reset confirmation is required');
  const {directory,manifest}=await loadManifest(db);
  const current=await regular(db);
  if(JSON.stringify(current.map(c=>c.name))!==JSON.stringify(manifest.collections.map(c=>c.name)))throw Error('Collections changed since backup; create a new backup before resetting');
  let removed=0;const session=client.startSession();
  try{await session.withTransaction(async()=>{
    removed=0;
    // Refuse to erase any writes not represented in the verified snapshot.
    for(const entry of manifest.collections){
      const hash=createHash('sha256');let count=0;
      for await(const doc of db.collection(entry.name).find({},{session,promoteValues:false,promoteLongs:false,bsonRegExp:true}).sort({_id:1})){hash.update(BSON.serialize(doc));count++;}
      if(count!==entry.count||hash.digest('hex')!==entry.plainHash)throw Error('Data changed since backup; stop writers and create a new backup before resetting');
    }
    for(const entry of manifest.collections)removed+=(await db.collection(entry.name).deleteMany({},{session})).deletedCount;
  },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});}finally{await session.endSession();}
  const remaining=[];for(const c of await regular(db))remaining.push(await db.collection(c.name).countDocuments({}));
  const count=remaining.reduce((n,v)=>n+v,0);if(count!==0)throw Error('New writes appeared after reset; database is not empty');
  await writeFile(path.join(directory,'reset-result.json'),JSON.stringify({database:db.databaseName,deleted:removed,remaining:count,completedAt:new Date().toISOString()},null,2),{flag:'wx'});
  console.log(JSON.stringify({mode:'reset',database:db.databaseName,deleted:removed,remaining:count,indexesPreserved:true,backupDirectory:directory}));
}

async function restore(db){
  if(option('--confirm-restore')!==db.databaseName)throw Error('Explicit restore confirmation is required');
  const {directory,manifest}=await loadManifest(db);
  for(const c of await regular(db))if(await db.collection(c.name).countDocuments({}))throw Error('Restore requires an empty database to avoid overwriting current data');
  const session=client.startSession();let restored=0;
  try{await session.withTransaction(async()=>{
    restored=0;
    for(const entry of manifest.collections){let batch=[];
      await readBackup(directory,entry,async doc=>{batch.push(doc);if(batch.length>=250){await db.collection(entry.name).insertMany(batch,{session,ordered:true});restored+=batch.length;batch=[];}});
      if(batch.length){await db.collection(entry.name).insertMany(batch,{session,ordered:true});restored+=batch.length;}
    }
  },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});}finally{await session.endSession();}
  console.log(JSON.stringify({mode:'restore',database:db.databaseName,restored}));
}

try{
  await client.connect();const db=client.db();
  if(protectedNames.has(db.databaseName))throw Error('System database operation refused');
  if(mode==='backup')await backup(db);else if(mode==='reset')await reset(db);else if(mode==='restore')await restore(db);else throw Error('Choose backup, reset or restore');
}catch(error){console.error('Database maintenance failed: '+(error.message&&/^(Backup|A |Configured|System|Explicit|Collections|Data changed|New writes|Restore|Invalid BSON|Choose)/.test(error.message)?error.message:error.codeName||error.name));process.exitCode=1;}finally{await client.close();}
