import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { City } from "../src/models/multi.model.js";
import Branch from "../src/models/branch.model.js";
import cityController from "../src/controllers/city.controller.js";
import branchController from "../src/controllers/branch.controller.js";
import { normalizeCity, resolveBranchCity, editCompanyCity } from "../src/services/company-cities.js";

const companyId='507f1f77bcf86cd799439011',cityId='507f1f77bcf86cd799439012';
const user={companyId,role:'company_admin',accountType:'company'};
const city={_id:cityId,companyId,cityName:'Hyderabad (East)',state:'Telangana',country:'India'};
const query=value=>({sort(){return this;},session(){return this;},lean:async()=>value,then:(resolve,reject)=>Promise.resolve(value).then(resolve,reject)});
const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});

test('city names are normalized and state/country are validated',()=>{
  const result=normalizeCity({cityName:' Hyderabad   East ',state:' Telangana ',country:'india'});assert.equal(result.cityName,'Hyderabad East');assert.equal(result.cityKey,'hyderabad east');assert.equal(result.country,'India');
  for(const input of [null,[],{cityName:' ',state:'Telangana'},{cityName:'City',state:{}},{cityName:'X'.repeat(101),state:'State'}])assert.throws(()=>normalizeCity(input));
});

test('company login creates its own city and ignores a supplied foreign company ID',async t=>{
  t.mock.method(City,'findOne',filter=>{assert.equal(filter.companyId,companyId);assert.ok(filter.cityName.$regex.test('HYDERABAD (EAST)'));assert.equal(filter.cityName.$regex.test('Hyderabad East'),false);return query(null);});
  let saved;t.mock.method(City.prototype,'save',async function(){saved=this;return this;});
  const res=response();await cityController.createCity({user,body:{cityName:' Hyderabad (East) ',state:'Telangana',companyId:'other'}},res);
  assert.equal(res.code,201);assert.equal(String(saved.companyId),companyId);assert.equal(saved.cityKey,'hyderabad (east)');
});

test('city duplicates return a clear conflict and a new company starts with an empty list',async t=>{
  t.mock.method(City,'findOne',()=>query(city));t.mock.method(City,'find',filter=>{assert.deepEqual(filter,{companyId});return query([]);});
  let res=response();await cityController.createCity({user,body:{cityName:'hyderabad (east)',state:'Telangana'}},res);assert.equal(res.code,409);
  res=response();await cityController.getCities({user},res);assert.equal(res.code,200);assert.deepEqual(res.body,[]);
});

test('Branch Admin and Staff cannot add cities',async()=>{
 for(const role of ['admin','staff']){const res=response();await cityController.createCity({user:{...user,role},body:{cityName:'City',state:'State'}},res);assert.equal(res.code,403);}
});

test('branch city lookup always includes company scope and derives canonical geography',async t=>{
  t.mock.method(City,'findOne',filter=>{assert.equal(filter.companyId,companyId);assert.equal(filter._id,cityId);return query(city);});
  assert.deepEqual(await resolveBranchCity(companyId,{cityId,city:'Wrong',state:'Wrong',country:'Wrong'}),{cityId,city:city.cityName,state:'Telangana',country:'India'});
});

test('unregistered or foreign city is rejected before a branch can be saved',async t=>{
  t.mock.method(City,'findOne',filter=>{assert.equal(filter.companyId,companyId);return query(null);});
  const save=t.mock.method(Branch.prototype,'save',async()=>assert.fail('must not save'));
  const res=response();await branchController.createBranch({user,body:{name:'Branch',cityId,city:'Unknown'}},res);assert.equal(res.code,400);assert.equal(save.mock.callCount(),0);
});

test('new branch is linked to the selected company city with trusted state/country',async t=>{
  t.mock.method(City,'findOne',()=>query(city));let saved;
  t.mock.method(Branch.prototype,'save',async function(){saved=this;return this;});
  const res=response();await branchController.createBranch({user,body:{name:'East branch',branchType:'normal',cityId,city:'Forged',state:'Other',country:'Elsewhere',location:'Main road',address:'12 Main road',phone:'9999999999',pincode:'500001'}},res);
  assert.equal(res.code,201);assert.equal(String(saved.cityId),cityId);assert.equal(saved.city,city.cityName);assert.equal(saved.state,'Telangana');assert.equal(saved.country,'India');
});

test('cities with branches cannot be deleted',async t=>{
  t.mock.method(City,'findOne',filter=>{assert.equal(filter.companyId,companyId);return query(city);});
  t.mock.method(Branch,'exists',async filter=>{assert.equal(filter.companyId,companyId);return {_id:'branch'};});
  const remove=t.mock.method(City,'deleteOne',async()=>assert.fail('must not delete'));
  let res=response();await cityController.deleteCity({user,params:{id:cityId}},res);assert.equal(res.code,409);
  assert.equal(remove.mock.callCount(),0);
});

test('same normalized city name can exist in separate companies but is unique per company',()=>{
  const [index]=City.schema.indexes();assert.deepEqual(index[0],{companyId:1,cityKey:1});assert.equal(index[1].unique,true);assert.equal(index[1].partialFilterExpression.cityKey.$type,'string');
});

function editSession(t){const state={ended:0,aborted:0};const session={withTransaction:async work=>{try{return await work();}catch(error){state.aborted++;throw error;}},endSession:async()=>{state.ended++;}};t.mock.method(mongoose,'startSession',async()=>session);return {session,state};}

test('city edits atomically refresh linked and legacy branch metadata within the same company',async t=>{
  const {session,state}=editSession(t);
  t.mock.method(City,'findOne',filter=>{assert.equal(filter.companyId,companyId);return query(typeof filter._id==='string'?city:null);});
  t.mock.method(City,'findOneAndUpdate',async(filter,update,options)=>{assert.equal(filter.companyId,companyId);assert.equal(options.session,session);assert.equal(update.$set.companyId,undefined);return {...city,...update.$set};});
  t.mock.method(Branch,'updateMany',async(filter,update,options)=>{assert.equal(filter.companyId,companyId);assert.equal(String(filter.$or[0].cityId),cityId);assert.equal(filter.$or[1].cityId,null);assert.ok(filter.$or[1].city.$regex.test(city.cityName));assert.equal(update.$set.city,'Hyderabad Metro');assert.equal(update.$set.state,'Telangana');assert.equal(options.session,session);return {modifiedCount:2};});
  const result=await editCompanyCity(companyId,cityId,{cityName:'Hyderabad Metro',companyId:'other'});assert.equal(result.city.cityName,'Hyderabad Metro');assert.equal(result.branchesUpdated,2);assert.equal(state.ended,1);
});

test('city edit rejects duplicates without updating city or branches',async t=>{
  editSession(t);t.mock.method(City,'findOne',filter=>query(typeof filter._id==='string'?city:{_id:'other'}));
  const write=t.mock.method(City,'findOneAndUpdate',async()=>assert.fail('must not update'));await assert.rejects(editCompanyCity(companyId,cityId,{cityName:'Duplicate'}),/already exists/);assert.equal(write.mock.callCount(),0);
});

test('foreign city edit returns not found and branch failure aborts the city transaction',async t=>{
  const {state}=editSession(t);let foreign=true;
  t.mock.method(City,'findOne',filter=>query(foreign?null:typeof filter._id==='string'?city:null));
  await assert.rejects(editCompanyCity(companyId,cityId,{cityName:'New'}),/not found/);
  foreign=false;t.mock.method(City,'findOneAndUpdate',async()=>({...city,cityName:'New'}));t.mock.method(Branch,'updateMany',async()=>{throw Error('Branch update failed');});
  await assert.rejects(editCompanyCity(companyId,cityId,{cityName:'New'}),/Branch update failed/);assert.equal(state.aborted,2);assert.equal(state.ended,2);
});

test('Branch Admin cannot edit company cities',async()=>{
  const res=response();await cityController.updateCity({user:{...user,role:'admin'},params:{id:cityId},body:{cityName:'New'}},res);assert.equal(res.code,403);
});
