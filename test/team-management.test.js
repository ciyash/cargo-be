import {test} from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import Admin from '../src/models/admin.auth.model.js';
import Branch from '../src/models/branch.model.js';
import controller from '../src/controllers/admin.auth.controller.js';
import {setStaffBlocked} from '../src/services/staff-access.js';
import {workspaceAuth} from '../src/middleware/workspace.auth.js';
const companyId='507f1f77bcf86cd799439011',targetId='507f1f77bcf86cd799439012',branchId='507f1f77bcf86cd799439013';
const actor={companyId,role:'company_admin',accountType:'company'};
const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});

test('Company Admin blocks and unblocks only a same-company account, preserving role and branch',async t=>{
 let saves=0;const account={_id:targetId,role:'admin',branchId,isBlocked:false,save:async()=>{saves++}};
 t.mock.method(Admin,'findOne',async filter=>{assert.deepEqual(filter,{_id:targetId,companyId});return account});
 await setStaffBlocked(actor,targetId,true);assert.equal(account.isBlocked,true);
 await setStaffBlocked(actor,targetId,false);assert.equal(account.isBlocked,false);
 assert.equal(saves,2);assert.equal(account.role,'admin');assert.equal(account.branchId,branchId);
});
test('block controls reject Branch Admin, Staff, self-block, invalid input and foreign accounts',async t=>{
 const find=t.mock.method(Admin,'findOne',async()=>null);
 for(const role of ['admin','staff'])await assert.rejects(setStaffBlocked({...actor,role},targetId,true),/Only Company Admin/);
 await assert.rejects(setStaffBlocked({...actor,id:targetId},targetId,true),/own account/);
 await assert.rejects(setStaffBlocked(actor,targetId,'false'),/true or false/);
 assert.equal(find.mock.callCount(),0);
 await assert.rejects(setStaffBlocked(actor,targetId,true),/not found in your company/);
});
test('blocked account cannot log in and cannot continue using an existing JWT',async t=>{
 t.mock.method(Admin,'findOne',()=>{const query={populate(){return this},select(){return this},lean:async()=>({role:'staff',isBlocked:true}),then(resolve,reject){return Promise.resolve({role:'staff',isBlocked:true}).then(resolve,reject)}};return query;});
 const res=response();await controller.login({body:{identifier:'blocked@example.test',password:'ExistingPassword123'}},res);
 assert.equal(res.statusCode,403);assert.match(res.body.message,/blocked/);
 const secret=process.env.JWT_SECRET;process.env.JWT_SECRET='team-block-test-secret';t.after(()=>{if(secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secret;});
 const token=jwt.sign({id:targetId,companyId,role:'company_admin'},process.env.JWT_SECRET,{expiresIn:'1h'});
 let failure;await workspaceAuth({get:()=> 'Bearer '+token},{},error=>{failure=error});
 assert.equal(failure.status,403);assert.match(failure.message,/blocked/);
});
test('company login edits team details without clearing an unchanged password or accepting ownership/status injection',async t=>{
 let saves=0;const account={_id:targetId,companyId,branchId,role:'staff',permissions:['bookings'],password:'existing-hash',isBlocked:false,save:async()=>{saves++}};
 t.mock.method(Admin,'findOne',async filter=>{assert.equal(filter.companyId,companyId);return account});
 t.mock.method(Branch,'exists',async filter=>{assert.equal(filter.companyId,companyId);assert.equal(filter._id,branchId);return {_id:branchId}});
 t.mock.method(Admin,'exists',async()=>null);
 const res=response();await controller.updateAccount({user:actor,params:{id:targetId},body:{name:'Updated name',email:'EDITED@example.test',username:'updated-user',role:'staff',branchId,branchCity:'Vijayawada',companyId:'foreign',isBlocked:true,password:''}},res);
 assert.equal(res.statusCode,200);assert.equal(saves,1);assert.equal(account.name,'Updated name');assert.equal(account.email,'edited@example.test');assert.equal(account.username,'updated-user');assert.equal(account.password,'existing-hash');assert.equal(account.companyId,companyId);assert.equal(account.isBlocked,false);
});

test('editing an account rejects duplicate login identities without saving',async t=>{
 let saved=false;const account={_id:targetId,role:'company_admin',permissions:[],email:'current@example.test',save:async()=>{saved=true}};
 t.mock.method(Admin,'findOne',async()=>account);
 t.mock.method(Admin,'exists',async filter=>{assert.equal(filter._id.$ne,targetId);assert.deepEqual(filter.$or,[{email:'used@example.test'}]);return {_id:'another-account'}});
 const res=response();await controller.updateAccount({user:actor,params:{id:targetId},body:{email:'used@example.test'}},res);
 assert.equal(res.statusCode,409);assert.equal(saved,false);
});
