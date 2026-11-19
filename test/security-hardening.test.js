import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import bcrypt from 'bcryptjs';
import Staff from "../src/models/admin.auth.model.js";
import Company from "../src/models/company.model.js";
import staffController from "../src/controllers/admin.auth.controller.js";
import companyController from "../src/controllers/company.controller.js";
import { authenticationThrottle } from "../src/utils/auth-throttle.js";
import { createApp } from "../src/app.js";
import { validateEnvironment } from "../src/config/environment.js";

const response=()=>Object.assign(new EventEmitter(),{statusCode:200,body:null,headers:{},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},set(key,value){this.headers[key]=value;return this;}});

test('production requires strong signing secrets and accepts an empty CORS allowlist',()=>{
 const env={NODE_ENV:'production',MONGO_URI:'test',JWT_SECRET:'a'.repeat(40),COMPANY_SECRET:'b'.repeat(40),CORS_ORIGINS:'https://crm.example.test'};
 assert.equal(validateEnvironment(env).port,4000);
 assert.throws(()=>validateEnvironment({...env,JWT_SECRET:'short'}),/32 characters\. Update: JWT_SECRET$/);
 assert.throws(()=>validateEnvironment({...env,COMPANY_SECRET:'short'}),/32 characters\. Update: COMPANY_SECRET$/);
 assert.throws(()=>validateEnvironment({...env,JWT_SECRET:'short',COMPANY_SECRET:'short'}),/32 characters\. Update: JWT_SECRET, COMPANY_SECRET$/);
 assert.throws(()=>validateEnvironment({...env,COMPANY_SECRET:env.JWT_SECRET}),/different/);
 assert.equal(validateEnvironment({...env,CORS_ORIGINS:''}).port,4000);
 assert.throws(()=>validateEnvironment({...env,CORS_ORIGINS:'*'}),/CORS_ORIGINS/);
});

test('login throttle shares aliases, bounds attempts, permits other clients and expires',()=>{
 let time=0;const throttle=authenticationThrottle({now:()=>time,loginLimit:2,ipLimit:100,windowMs:1000});
 const attempt=(path,identity='person@example.test',ip='client')=>{const res=response();let passed=false;throttle({method:'POST',path,ip,body:{email:identity,identifier:identity}},res,()=>{passed=true;});return {res,passed};};
 assert.ok(attempt('/company/login').passed);assert.ok(attempt('/subadmin-auth/login').passed);
 const blocked=attempt('/auth/login');assert.equal(blocked.res.statusCode,429);assert.equal(blocked.res.headers['Retry-After'],'1');
 assert.ok(attempt('/auth/login','other@example.test').passed);assert.ok(attempt('/auth/login','person@example.test','other-client').passed);
 time=1001;assert.ok(attempt('/auth/login').passed);
});

test('real HTTP login aliases reject malformed input before DB and share throttling',async t=>{
 t.mock.method(Staff,'findOne',()=>{throw Error('Malformed input must not query Staff');});
 t.mock.method(Company,'findOne',()=>{throw Error('Malformed input must not query Company');});
 const server=createApp().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const paths=['/auth/login','/company/login','/subadmin-auth/login','/company/subsidiary/login'];
 for(let index=0;index<11;index++){
  const result=await fetch('http://127.0.0.1:'+server.address().port+paths[index%paths.length],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'person@example.test',identifier:'person@example.test',password:{$ne:null}})});
  assert.equal(result.status,index<10?400:429);await result.json();
 }
});

test('recovery rejects operator objects, weak passwords and malformed OTPs without DB access',async t=>{
 t.mock.method(Staff,'findOne',()=>{throw Error('No query permitted');});t.mock.method(Staff,'findOneAndUpdate',()=>{throw Error('No query permitted');});
 let res=response();await staffController.forgotPassword({body:{email:{$ne:null}}},res);assert.equal(res.statusCode,400);
 for(const body of [{email:{$ne:null},otp:'123456',newPassword:'ValidPassword123'},{email:'user@example.test',otp:{$ne:null},newPassword:'ValidPassword123'},{email:'user@example.test',otp:'123456',newPassword:'short'}]){res=response();await staffController.resetPassword({body},res);assert.equal(res.statusCode,400);}
});

test('OTP reset stops after five wrong guesses even when the next supplied OTP is correct',async t=>{
 let attempts=0;
 t.mock.method(Staff,'findOneAndUpdate',async(filter,update)=>{assert.equal(filter.email,'user@example.test');assert.equal(update.$inc.otpAttempts,1);assert.ok(filter.otpExpires.$gt instanceof Date);assert.equal(filter.$or[1].otpAttempts.$lt,5);if(attempts>=5)return null;attempts++;return {_id:'account',password:'old',otp:123456};});
 t.mock.method(Staff,'updateOne',()=>{throw Error('No password write permitted');});
 for(let index=0;index<6;index++){const res=response();await staffController.resetPassword({body:{email:'user@example.test',otp:index===5?'123456':'654321',newPassword:'ValidPassword123'}},res);assert.equal(res.statusCode,400);}
 assert.equal(attempts,5);
});

test('concurrent valid OTP resets can update the password only once and consume recovery fields',async t=>{
 let password='original-hash',otp=123456,writes=0;
 t.mock.method(Staff,'findOneAndUpdate',async()=>otp?{_id:'account',password,otp}:null);
 t.mock.method(Staff,'updateOne',async(filter,update)=>{assert.equal(filter._id,'account');assert.equal(filter.otp,123456);assert.deepEqual(update.$unset,{otp:1,otpExpires:1,otpAttempts:1});if(otp!==filter.otp||password!==filter.password)return {matchedCount:0};password=update.$set.password;otp=null;writes++;return {matchedCount:1};});
 const responses=[response(),response()];await Promise.all(responses.map(res=>staffController.resetPassword({body:{email:'user@example.test',otp:'123456',newPassword:'ValidPassword123'}},res)));
 assert.deepEqual(responses.map(res=>res.statusCode).sort(),[200,400]);assert.equal(writes,1);assert.ok(await bcrypt.compare('ValidPassword123',password));
 const replay=response();await staffController.resetPassword({body:{email:'user@example.test',otp:'123456',newPassword:'AnotherPassword123'}},replay);assert.equal(replay.statusCode,400);
});

test('public subsidiary registration cannot attach to another tenant and weak company passwords cannot be saved',async t=>{
 t.mock.method(Company,'findOne',()=>{throw Error('No company lookup permitted');});t.mock.method(Company,'findByIdAndUpdate',()=>{throw Error('No update permitted');});
 const parent=response();await companyController.registerSubsidiaryCompany({body:{parentCompanyId:'507f1f77bcf86cd799439011'}},parent);assert.equal(parent.statusCode,403);
 const weak=response();await companyController.updateCompany({body:{password:'short'},headers:{},user:{companyId:'company'}},weak);assert.equal(weak.statusCode,400);
});
