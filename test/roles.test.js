import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORK_PERMISSIONS, defaultPermissions, normalizeRole, roleLabel, permissionsFor, staffAccessInput, validatePermissions, hasPermission, legacyPermission } from "../src/services/roles.js";
import jwt from 'jsonwebtoken';
import Company from "../src/models/company.model.js";
import Staff from "../src/models/admin.auth.model.js";
import Branch from "../src/models/branch.model.js";
import { workspaceAuth, isManager } from "../src/middleware/workspace.auth.js";
import { authorizeLegacy } from "../src/services/roles.js";
import { unifiedLogin } from "../src/controllers/unified-login.controller.js";
import companyController from "../src/controllers/company.controller.js";
import staffController from "../src/controllers/admin.auth.controller.js";
import bcrypt from 'bcryptjs';
import { proposedCompanyAdminAuth } from "../src/middleware/company.auth.js";
import { createApp } from "../src/app.js";
import Payment from "../src/models/payment.model.js";
import { updateStaffAccess, branchAssignmentFilter } from "../src/services/staff-access.js";

test('only three business roles; historical account roles keep their work permissions',()=>{
  assert.equal(normalizeRole('company'),'company_admin');assert.equal(normalizeRole('superadmin'),'company_admin');assert.equal(normalizeRole('branch_admin'),'admin');
  for(const role of ['accountant','driver','superviser','employee'])assert.equal(normalizeRole(role),'staff');
  assert.equal(normalizeRole('__proto__'),null);assert.equal(normalizeRole('owner'),null);
  assert.equal(roleLabel('company'),'Company Admin');assert.equal(roleLabel('admin'),'Branch Admin');assert.equal(roleLabel('driver'),'Staff');
  assert.deepEqual(permissionsFor({role:'accountant'}),['accounts','reports']);assert.deepEqual(permissionsFor({role:'driver'}),['delivery']);
  assert.equal(hasPermission({role:'staff',permissions:[]},'bookings'),true);
  assert.equal(hasPermission({role:'staff',permissions:['team','subscription','reports']},'team'),false);
});
test('new Staff gets explicit work permissions; branch managers cannot grant other roles or permissions',()=>{
  const company={role:'company'};assert.deepEqual(staffAccessInput({role:'staff'},company),{role:'staff',permissions:WORK_PERMISSIONS});
  const branch={role:'admin',permissions:['team',...WORK_PERMISSIONS]};
  assert.deepEqual(staffAccessInput({role:'staff',permissions:['bookings']},branch),{role:'staff',permissions:WORK_PERMISSIONS});
  assert.throws(()=>staffAccessInput({role:'company_admin'},branch),/Branch Admin/);
  assert.throws(()=>staffAccessInput({role:'admin'},branch),/Branch Admin/);
  assert.throws(()=>staffAccessInput({role:'staff',permissions:['accounts']},{role:'admin',permissions:['team','bookings']}),/only assign/);
  assert.throws(()=>validatePermissions(['subscription'],'staff',company),/cannot receive/);
  assert.throws(()=>validatePermissions(['unknown'],'staff',company),/valid work/);
});
test('legacy routes classify work and settings consistently',()=>{
 const request=(baseUrl,path,method='POST')=>({baseUrl,route:{path},method});
 assert.equal(legacyPermission(request('/booking','/')),'bookings');
 assert.equal(legacyPermission(request('/booking','/delivery-booking')),'delivery');
 assert.equal(legacyPermission(request('/booking','/all-collection-report')),'reports');
 assert.equal(legacyPermission(request('/branch','/')),'branches');
 assert.equal(legacyPermission(request('/branch','/','GET')),null);
 assert.equal(legacyPermission(request('/subadmin-auth','/profile','GET')),null);
 assert.equal(legacyPermission(request('/subadmin-auth','/signup')),'team');
});

test('DB-backed authentication retains company login and company-wide admin access',async t=>{
 const secret=process.env.COMPANY_SECRET;process.env.COMPANY_SECRET='role-company-test-secret';t.after(()=>{if(secret===undefined)delete process.env.COMPANY_SECRET;else process.env.COMPANY_SECRET=secret;});
 const companyId='507f1f77bcf86cd799439011';
 t.mock.method(Company,'findById',id=>{assert.equal(id,companyId);return {select:()=>({lean:async()=>({_id:companyId,name:'Test Company',isBlocked:false})})};});
 const token=jwt.sign({role:'company',companyId},process.env.COMPANY_SECRET,{expiresIn:'1h'}),req={get:()=>`Bearer ${token}`};
 let error;await workspaceAuth(req,{},e=>{error=e;});assert.equal(error,undefined);assert.ok(isManager(req.user));assert.equal(req.user.accountType,'company');assert.equal(req.user.roleLabel,'Company Admin');assert.ok(req.user.permissions.includes('subscription'));
});

test('DB-backed auth re-reads role/permissions rather than trusting stale elevated JWT claims',async t=>{
 const secret=process.env.JWT_SECRET;process.env.JWT_SECRET='role-staff-test-secret';t.after(()=>{if(secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secret;});
 const companyId='507f1f77bcf86cd799439011',id='507f1f77bcf86cd799439012';
 t.mock.method(Staff,'findOne',filter=>{assert.deepEqual(filter,{_id:id,companyId});return {select:()=>({lean:async()=>({_id:id,companyId,role:'staff',permissions:['reports'],branchId:'507f1f77bcf86cd799439013'})})};});
 t.mock.method(Branch,'findOne',filter=>{assert.equal(filter.companyId,companyId);return {lean:async()=>({_id:'507f1f77bcf86cd799439013',branchUniqueId:'BR01'})};});
 t.mock.method(Company,'findById',()=>({select:()=>({lean:async()=>({_id:companyId,isBlocked:false})})}));
 const token=jwt.sign({id,companyId,role:'company_admin',permissions:['subscription','bookings']},process.env.JWT_SECRET,{expiresIn:'1h'}),req={get:()=>`Bearer ${token}`};
 let error;await workspaceAuth(req,{},e=>{error=e;});assert.equal(error,undefined);assert.equal(isManager(req.user),false);assert.equal(req.user.branchId,'BR01');assert.deepEqual(req.user.permissions,WORK_PERMISSIONS);
 req.baseUrl='/booking';req.route={path:'/'};req.method='POST';authorizeLegacy(req,{},e=>{error=e;});assert.equal(error,undefined);
 req.baseUrl='/multi-router';req.route={path:'/cities'};authorizeLegacy(req,{},e=>{error=e;});assert.equal(error.status,403);
 error=undefined;req.baseUrl='/booking';req.route.path='/all-collection-report';authorizeLegacy(req,{},e=>{error=e;});assert.equal(error,undefined);
});

test('deleted users, unassigned branch staff, blocked companies and expired tokens are rejected',async t=>{
 const oldJwt=process.env.JWT_SECRET,oldCompany=process.env.COMPANY_SECRET;process.env.JWT_SECRET='role-staff-test';process.env.COMPANY_SECRET='role-company-test';t.after(()=>{for(const [key,value] of [['JWT_SECRET',oldJwt],['COMPANY_SECRET',oldCompany]])if(value===undefined)delete process.env[key];else process.env[key]=value;});
 const companyId='507f1f77bcf86cd799439011',id='507f1f77bcf86cd799439012';let staff=null,blocked=false;
 t.mock.method(Staff,'findOne',()=>({select:()=>({lean:async()=>staff})}));
 t.mock.method(Company,'findById',()=>({select:()=>({lean:async()=>({_id:companyId,isBlocked:blocked})})}));
 async function rejected(claims,secret,expiresIn,status){let error;await workspaceAuth({get:()=>`Bearer ${jwt.sign(claims,secret,{expiresIn})}`},{},e=>{error=e;});assert.equal(error?.status,status);}
 await rejected({id,companyId},process.env.JWT_SECRET,'1h',401);
 staff={role:'staff',companyId};await rejected({id,companyId},process.env.JWT_SECRET,'1h',403);
 blocked=true;await rejected({role:'company',companyId},process.env.COMPANY_SECRET,'1h',403);
 await rejected({id,companyId},process.env.JWT_SECRET,-1,401);
});

test('one login handler accepts existing company credentials and existing staff identifiers',async t=>{
 const hash=await bcrypt.hash('password123',4);let company={password:hash},kind;
 t.mock.method(Company,'findOne',async()=>company);
 t.mock.method(companyController,'loginCompany',async req=>{kind='company';assert.equal(req.body.email,'admin@example.com');});
 t.mock.method(staffController,'login',async req=>{kind='staff';assert.equal(req.body.identifier,'staff-user');});
 await unifiedLogin({body:{identifier:'Admin@Example.com',password:'password123'}},{},e=>{throw e;});assert.equal(kind,'company');
 company=null;await unifiedLogin({body:{identifier:'staff-user',password:'password123'}},{},e=>{throw e;});assert.equal(kind,'staff');
});

test('proposed company admin activation denies branch users; current DB admin is allowed',async t=>{
 const old=process.env.JWT_SECRET;process.env.JWT_SECRET='reviewed-company-admin-test';t.after(()=>{if(old===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=old;});
 const companyId='507f1f77bcf86cd799439011',id='507f1f77bcf86cd799439012';let role='admin';
 t.mock.method(Staff,'findOne',()=>({select:()=>({lean:async()=>({_id:id,companyId,role,branchId:'507f1f77bcf86cd799439013'})})}));
 t.mock.method(Branch,'findOne',()=>({lean:async()=>({_id:'507f1f77bcf86cd799439013',branchUniqueId:'BR01'})}));
 t.mock.method(Company,'findById',()=>({select:()=>({lean:async()=>({_id:companyId,isBlocked:false})})}));
 const token=jwt.sign({companyId,id,role:'company_admin'},process.env.JWT_SECRET,{expiresIn:'1h'});let error;
 await proposedCompanyAdminAuth({get:()=>`Bearer ${token}`},{},e=>{error=e;});assert.equal(error.status,403);
 role='company_admin';error=undefined;await proposedCompanyAdminAuth({get:()=>`Bearer ${token}`},{},e=>{error=e;});assert.equal(error,undefined);
});

test('Staff retains operational access and quota checks but cannot use billing or team administration',async t=>{
 const old=process.env.JWT_SECRET;process.env.JWT_SECRET='role-http-test';t.after(()=>{if(old===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=old;});
 const companyId='507f1f77bcf86cd799439011',id='507f1f77bcf86cd799439012';let role='staff',permissions=['reports'];
 t.mock.method(Staff,'findOne',()=>({select:()=>({lean:async()=>({_id:id,companyId,role,permissions,branchId:'507f1f77bcf86cd799439013'})})}));
 t.mock.method(Branch,'findOne',()=>({lean:async()=>({_id:'507f1f77bcf86cd799439013',branchUniqueId:'BR01'})}));
 t.mock.method(Company,'findById',()=>({select:()=>({lean:async()=>({_id:companyId,isBlocked:false})})}));
 t.mock.method(Payment,'find',()=>({select(){return this;},sort(){return this;},limit(){return this;},lean:async()=>[]}));
 const server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const headers={Authorization:'Bearer '+jwt.sign({companyId,id,role:'company_admin'},process.env.JWT_SECRET),'Content-Type':'application/json'},base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/billing/history',{headers})).status,403);
 assert.equal((await fetch(base+'/booking',{method:'POST',headers,body:'{}'})).status,402);
 assert.equal((await fetch(base+'/multi-router/cities',{method:'POST',headers,body:'{}'})).status,403);
 assert.equal((await fetch(base+'/workspace/staff',{headers})).status,403);
 role='company_admin';permissions=[];assert.equal((await fetch(base+'/billing/history',{headers})).status,200);
});

test('Branch Admin creates Staff only in assigned branch and cannot escalate role or permissions',async t=>{
 const companyId='507f1f77bcf86cd799439011',branchId='507f1f77bcf86cd799439013',actor={companyId,id:'507f1f77bcf86cd799439012',role:'admin',branchObjectId:branchId,permissions:['team',...WORK_PERMISSIONS]};
 t.mock.method(Staff,'findOne',async()=>null);t.mock.method(Branch,'exists',async filter=>{assert.equal(filter.companyId,companyId);assert.equal(String(filter._id),branchId);return {_id:branchId};});
 let saves=0;t.mock.method(Staff.prototype,'save',async function(){saves++;assert.equal(this.role,'staff');assert.equal(String(this.branchId),branchId);assert.deepEqual([...this.permissions],WORK_PERMISSIONS);return this;});
 const response=()=>({code:200,status(n){this.code=n;return this;},json(body){this.body=body;return this;}}),base={name:'Staff',email:'staff@example.test',password:'password123',role:'staff',branchId,permissions:['bookings']};
 let res=response();await staffController.signup({user:actor,body:base},res);assert.equal(res.code,201);
 for(const change of [{role:'company_admin'},{branchId:'507f1f77bcf86cd799439099'},{permissions:['settings']}]){res=response();await staffController.signup({user:actor,body:{...base,...change}},res);assert.equal(res.code,403);}
 assert.equal(saves,1);
});

test('staff access edits retain company/branch scope and reject self-escalation',async t=>{
 const companyId='507f1f77bcf86cd799439011',branchId='507f1f77bcf86cd799439013',actor={companyId,id:'507f1f77bcf86cd799439012',role:'admin',branchObjectId:branchId,permissions:['team',...WORK_PERMISSIONS]};
 let saved=0;const target={_id:'507f1f77bcf86cd799439014',companyId,branchId,role:'staff',permissions:['bookings'],save:async()=>{saved++;}};
 t.mock.method(Staff,'findOne',async filter=>{assert.equal(filter.companyId,companyId);assert.equal(filter.branchId,branchId);return target;});
 t.mock.method(Branch,'exists',async()=>({_id:branchId}));
 await updateStaffAccess(actor,target._id,{role:'staff',permissions:[]});assert.deepEqual(target.permissions,WORK_PERMISSIONS);assert.equal(saved,1);
 await assert.rejects(updateStaffAccess(actor,target._id,{role:'company_admin'}),/Branch Admin/);assert.equal(saved,1);
 target._id=actor.id;await assert.rejects(updateStaffAccess(actor,target._id,{permissions:['bookings']}),/own access/);
});

test('Staff has every daily operation including Credit Accounts but no company setup; admin roles retain their policy',()=>{
 assert.deepEqual(defaultPermissions('staff'),WORK_PERMISSIONS);
 assert.deepEqual(permissionsFor({role:'staff',permissions:[]}),WORK_PERMISSIONS);
 assert.deepEqual(permissionsFor({role:'staff',permissions:['settings','team']}),WORK_PERMISSIONS);
 assert.deepEqual(permissionsFor({role:'admin',permissions:['team','reports']}),['team','reports']);
 assert.deepEqual(defaultPermissions('admin'),[...WORK_PERMISSIONS,'team']);
 assert.ok(permissionsFor({role:'company_admin'}).includes('settings'));
 const check=(baseUrl,path,method)=>{let error;authorizeLegacy({user:{role:'staff',permissions:['reports']},baseUrl,route:{path},method},{},e=>{error=e;});return error;};
 for(const [base,path,method] of [['/booking','/','POST'],['/booking','/cancelBooking/:id','POST'],['/parcel-loading','/','POST'],['/parcel-unloading','/','POST'],['/booking','/delivery-booking','POST'],['/booking','/parcel-booking-report','POST'],['/cfmaster','/','GET'],['/cfmaster','/','POST'],['/voucher-generate','/','POST']])assert.equal(check(base,path,method),undefined,base+path);
 for(const [base,path,method] of [['/subadmin-auth','/signup','POST'],['/branch','/','POST'],['/multi-router','/cities','POST'],['/vehicle','/','POST'],['/item','/','POST']])assert.equal(check(base,path,method)?.status,403,base+path);
});

test('city-based assignments preserve company scope and match the selected city literally',()=>{
 const filter=branchAssignmentFilter('company','branch','  Hyderabad (East)  ');
 assert.equal(filter.companyId,'company');assert.equal(filter._id,'branch');
 assert.ok(filter.city.$regex.test('HYDERABAD (EAST)'));assert.equal(filter.city.$regex.test('Hyderabad East'),false);
 assert.equal(filter.city.$regex.test('Other Hyderabad (East)'),false);
 assert.deepEqual(branchAssignmentFilter('company','branch'),{_id:'branch',companyId:'company'});
 for(const city of ['',{},'x'.repeat(101)])assert.throws(()=>branchAssignmentFilter('company','branch',city),/valid city/);
});

test('a submitted branch from another city is rejected before account creation',async t=>{
 const companyId='507f1f77bcf86cd799439011',branchId='507f1f77bcf86cd799439013';
 t.mock.method(Staff,'findOne',async()=>null);
 t.mock.method(Branch,'exists',async filter=>{assert.equal(filter.companyId,companyId);assert.ok(filter.city.$regex.test('Hyderabad'));return null;});
 const save=t.mock.method(Staff.prototype,'save',async()=>assert.fail('Mismatched city must not save'));
 const res={code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await staffController.signup({user:{companyId,role:'company_admin'},body:{name:'Branch Admin',email:'branch@example.test',password:'password123',role:'admin',branchId,branchCity:'Hyderabad'}},res);
 assert.equal(res.code,400);assert.match(res.body.message,/selected city/);assert.equal(save.mock.calls.length,0);
});
