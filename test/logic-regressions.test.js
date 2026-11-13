import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import axios from 'axios';
import { calculateBooking, bookingEdits } from "../src/services/booking-calculation.js";
import { legacyPermission, authorizeLegacy } from "../src/services/roles.js";
import { withLegacyDataScope } from "../src/services/legacy-data-scope.js";
import { Booking, Delivery, User } from "../src/models/booking.model.js";
import Company from "../src/models/company.model.js";
import Branch from "../src/models/branch.model.js";
import Counter from "../src/models/counter.model.js";
import CFVoucher from "../src/models/cf.voucher.generate.model.js";
import { QuotaEvent, CourierConnection } from "../src/models/logistics.model.js";
import { Expense } from "../src/models/expensive.model.js";
import { createVouchers, reverseStatementBooking } from "../src/services/voucher-workflow.js";
import { branchMovements } from "../src/services/branch-balance.js";
import { encryptCredentials } from "../src/services/couriers.js";
import { delhiveryRequest } from '../src/services/delhivery.js';
import { createShipment, ownOperation } from "../src/services/shipping.js";
import bookingController from "../src/controllers/booking.controller.js";

const companyId='507f1f77bcf86cd799439011', id='507f1f77bcf86cd799439012', branchId='507f1f77bcf86cd799439021';
const user={companyId,id,role:'staff',branchId:'ORIGIN',permissions:['reports']};
const admin={...user,role:'company_admin',companyName:'Audit Logistics'};
const query=value=>({sort(){return this;},select(){return this;},session(){return this;},populate(){return this;},lean:async()=>value,then:(resolve,reject)=>Promise.resolve(value).then(resolve,reject)});
const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const session={withTransaction:async fn=>fn(),endSession:async()=>{}};
const input=()=>({bookingType:'paid',packages:[{quantity:'2',unitPrice:'100.25',totalPrice:1}],serviceCharges:'10',parcelGstAmount:'2.5',grandTotal:1});

test('authoritative freight ignores caller totals, includes all charges and rounds cents',()=>{
  const result=calculateBooking(input());
  assert.equal(result.packages[0].totalPrice,200.5);assert.equal(result.grandTotal,213);assert.equal(result.totalQuantity,2);
  assert.equal(calculateBooking({...input(),bookingType:'FOC'}).grandTotal,0);
  assert.equal(calculateBooking({bookingType:'paid',packages:[{quantity:3,unitPrice:.1}]}).grandTotal,.3);
  for(const value of [true,{},'',-1,Infinity,'NaN'])assert.throws(()=>calculateBooking({...input(),serviceCharges:value}));
  for(const quantity of [true,0,1.5,1001,null])assert.throws(()=>calculateBooking({...input(),packages:[{quantity,unitPrice:1}]}));
});

test('general edits reject money, payment, party and statement changes',()=>{
  for(const key of ['grandTotal','packages','bookingType','toPayDeliveredAmount','refundAmount','status','agent','parcelGstAmount'])assert.throws(()=>bookingEdits({[key]:1}),/cannot be changed/);
  assert.deepEqual(bookingEdits({remarks:'ok',companyId:'other',bookingStatus:4}),{remarks:'ok'});
});

test('mixed-case cancellation retains booking classification under the full Staff work policy',()=>{
  const req={baseUrl:'/booking',route:{path:'/cancelBooking/:grnNo'},method:'POST',user};
  assert.equal(legacyPermission(req),'bookings');let error;authorizeLegacy(req,{},e=>{error=e;});assert.equal(error,undefined);
  authorizeLegacy({...req,user:{...user,role:'accountant',permissions:['reports']}},{},e=>{error=e;});assert.equal(error.status,403);
  assert.equal(legacyPermission({...req,route:{path:'/updateAllGrnNumbers'}}),'delivery');
});

test('Mongoose query and aggregation hooks scope old paths without overwriting search OR clauses',async t=>{
  const filters=[],pipelines=[];
  t.mock.method(Booking.collection,'find',filter=>{filters.push(filter);return {toArray:async()=>[]};});
  t.mock.method(Booking.collection,'aggregate',pipeline=>{pipelines.push(pipeline);return {toArray:async()=>[]};});
  await withLegacyDataScope(user,async()=>{
    await Booking.find({$or:[{senderName:'A'},{receiverName:'A'}]}).lean();
    await Booking.aggregate([{$group:{_id:null,count:{$sum:1}}}]);
  });
  assert.equal(filters[0].$and[0].$or.length,2);
  assert.equal(filters[0].$and[1].$or[0].pickUpBranch,'ORIGIN');
  assert.equal(String(pipelines[0][0].$match.companyId),companyId);
  assert.equal(pipelines[0][0].$match.$or[1].dropBranch,'ORIGIN');
  await withLegacyDataScope(admin,()=>Booking.find({}).lean());
  assert.deepEqual(Object.keys(filters[1].$and[1]),['companyId']);
  await Booking.find({}).lean();assert.deepEqual(filters[2],{});
});

test('parallel request scopes do not share branch assignments',async t=>{
  const filters=[];t.mock.method(Delivery.collection,'find',filter=>{filters.push(filter);return {toArray:async()=>[]};});
  await Promise.all(['A','B'].map(branchId=>withLegacyDataScope({...user,branchId},async()=>{await Promise.resolve();await Delivery.find({}).lean();})));
  assert.deepEqual(filters.map(f=>f.$and[1].deliveryBranch).sort(),['A','B']);
});

test('historical statement visibility resolves all GRNs under the same company and origin',async t=>{
  let ownershipPipeline,filter;
  t.mock.method(CFVoucher.collection,'aggregate',pipeline=>{ownershipPipeline=pipeline;return {toArray:async()=>[{_id:new mongoose.Types.ObjectId(id)}]};});
  t.mock.method(CFVoucher.collection,'find',query=>{filter=query;return {toArray:async()=>[]};});
  await withLegacyDataScope(user,()=>CFVoucher.find({}).lean());
  assert.equal(String(ownershipPipeline[0].$match.companyId),companyId);
  assert.deepEqual(ownershipPipeline[1].$lookup.pipeline[0].$match.$expr.$and[0],{$eq:['$companyId','$$tenant']});
  assert.equal(ownershipPipeline[2].$match.$expr.$and.length,2);
  assert.equal(filter.$and[1].$or[0].originBranch,'ORIGIN');
  assert.equal(String(filter.$and[1].$or[1]._id.$in[0]),id);
});

test('legacy create controller saves recomputed paid freight and zero FOC',async t=>{
  t.mock.method(Company,'findById',()=>query({_id:companyId,bookingQuota:{purchased:10000,used:0,held:0},isBlocked:false,operatingCategories:'both'}));
  t.mock.method(Company,'updateOne',async()=>({matchedCount:1}));
  t.mock.method(Branch,'findOne',filter=>query({_id:branchId,companyId,name:'Origin',branchUniqueId:filter.branchUniqueId||'ORIGIN',ownershipType:'own',city:'Hyderabad',location:'Main'}));
  t.mock.method(Booking,'findOne',()=>query(null));let sequence=1000;t.mock.method(Counter,'findOneAndUpdate',async()=>({value:++sequence}));
  t.mock.method(mongoose,'startSession',async()=>session);t.mock.method(QuotaEvent,'create',async rows=>rows);t.mock.method(User,'findOne',async()=>({_id:id}));
  const saved=[];t.mock.method(Booking.prototype,'save',async function(){saved.push(this.toObject());return this;});
  const body={...input(),fromCity:'Hyderabad',toCity:'Vijayawada',pickUpBranch:'ORIGIN',dropBranch:'DEST',senderName:'Sender',senderMobile:'9999999999',receiverName:'Receiver',receiverMobile:'8888888888'};
  for(const bookingType of ['paid','FOC']){const res=response();await bookingController.createBooking({user:admin,body:{...body,bookingType}},res);assert.equal(res.code,201,JSON.stringify(res.body));}
  assert.equal(saved[0].grandTotal,213);assert.equal(saved[0].toPayDeliveredAmount,213);assert.equal(saved[1].grandTotal,0);assert.equal(saved[1].toPayDeliveredAmount,0);
});

test('credit statements reject cancelled, pending, noncredit and other-origin bookings',async t=>{
  t.mock.method(CFVoucher,'startSession',async()=>session);
  let row; t.mock.method(Booking,'find',()=>query([row]));
  const insert=t.mock.method(CFVoucher,'insertMany',async()=>assert.fail('ineligible bookings must not be billed'));
  for(const changes of [{bookingStatus:5},{confirmationStatus:'pending'},{bookingType:'paid'},{pickUpBranch:'OTHER'}]){
    row={grnNo:1001,agent:'Party',bookingType:'credit',bookingStatus:0,confirmationStatus:'confirmed',pickUpBranch:'ORIGIN',...changes};
    await assert.rejects(createVouchers({grnNo:1001},user));
  }
  assert.equal(insert.mock.callCount(),0);
});

test('credit statements separate origins even when the same party is used',async t=>{
  t.mock.method(CFVoucher,'startSession',async()=>session);t.mock.method(CFVoucher,'findOne',()=>query(null));
  t.mock.method(Counter,'findOneAndUpdate',async()=>({value:101}));
  t.mock.method(Booking,'find',()=>query(['A','B'].map((pickUpBranch,i)=>({grnNo:1001+i,lrNumber:String(i),agent:'Party',pickUpBranch,bookingType:'credit',grandTotal:100}))));
  t.mock.method(CFVoucher,'insertMany',async rows=>rows);t.mock.method(Booking,'updateMany',async()=>({matchedCount:2}));
  const rows=await createVouchers({grnNo:[1001,1002]},admin);assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.originBranch),['A','B']);
});

test('cancelling a billed parcel preserves statement history and reduces the charge',async t=>{
  let saves=0;const statement={grnNo:[1001,1002],lrNumber:['LR1','LR2'],charge:'300',voidedGrnNo:[],save:async options=>{assert.equal(options.session,session);saves++;}};
  t.mock.method(CFVoucher,'find',()=>query([statement]));
  await reverseStatementBooking({companyId,status:true,grnNo:1001,lrNumber:'LR1',grandTotal:100},session);
  assert.deepEqual(statement.grnNo,[1002]);assert.equal(statement.charge,'200');assert.deepEqual(statement.voidedGrnNo,[1001]);assert.equal(saves,1);
  await reverseStatementBooking({companyId,status:true,grnNo:1002,lrNumber:'LR2',grandTotal:200},session);
  assert.equal(statement.statementState,'void');assert.equal(statement.charge,'0');
});

test('branch balances use prepaid receipts, delivered To Pay and dated cancellation reversals',async t=>{
  const seen=[];
  t.mock.method(Booking,'aggregate',async pipeline=>{const match=pipeline[0].$match;seen.push(match);return [{total:match.cancelDate?30:100}];});
  t.mock.method(Delivery,'aggregate',async pipeline=>{assert.equal(pipeline[0].$match.bookingType,'toPay');return [{total:50}];});
  t.mock.method(Expense,'aggregate',async()=>[{total:20}]);
  const range={$gte:new Date('2026-11-12'),$lt:new Date('2026-11-13')};
  const result=await branchMovements(new mongoose.Types.ObjectId(companyId),{_id:branchId,branchUniqueId:'ORIGIN'},range);
  assert.equal(result.income,120);assert.equal(result.expenses,20);assert.equal(seen[0].bookingType,'paid');assert.equal(seen[1].bookingStatus,5);assert.equal(seen[1].cancelDate,range);
});

test('courier pre-request credential errors and HTTP rejection are definitive, transport timeouts are not',async t=>{
  const old=process.env.COURIER_ENCRYPTION_KEY;process.env.COURIER_ENCRYPTION_KEY='11'.repeat(32);t.after(()=>{if(old===undefined)delete process.env.COURIER_ENCRYPTION_KEY;else process.env.COURIER_ENCRYPTION_KEY=old;});
  await assert.rejects(delhiveryRequest({credentials:'invalid',environment:'staging'},'POST','/api/cmu/create.json'),e=>e.definitive===true);
  const connection={credentials:encryptCredentials({apiToken:'test'}),environment:'staging'};let failure={response:{status:401}};
  t.mock.method(axios,'request',async()=>{throw failure;});
  // Axios is callable; use its adapter to exercise the actual HTTP wrapper without network.
  const oldAdapter=axios.defaults.adapter;axios.defaults.adapter=async()=>{throw failure;};t.after(()=>{axios.defaults.adapter=oldAdapter;});
  await assert.rejects(delhiveryRequest(connection,'POST','/api/cmu/create.json'),e=>e.definitive===true);
  failure={code:'ECONNABORTED'};await assert.rejects(delhiveryRequest(connection,'POST','/api/cmu/create.json'),e=>e.definitive===false);
});

test('own delivery records the destination branch name and rejects duplicate freight collection',async t=>{
  const row={_id:id,companyId,fulfilment:'own',confirmationStatus:'confirmed',bookingStatus:2,bookingType:'paid',dropBranch:'DEST',dropBranchname:'Destination',toCity:'Vijayawada',trackingEvents:[],save:async()=>{}};
  t.mock.method(mongoose,'startSession',async()=>session);t.mock.method(Booking,'findOne',()=>query(row));let created;
  t.mock.method(Delivery,'create',async docs=>{created=docs[0];});
  await assert.rejects(ownOperation(admin,id,{action:'deliver',amount:1,receiver:'Receiver',phone:'9999999999'}),/Only To Pay/);
  await ownOperation(admin,id,{action:'deliver',amount:0,receiver:'Receiver',phone:'9999999999'});assert.equal(created.deliveryBranchName,'Destination');assert.equal(row.deliveryBranchName,'Destination');
});

function mockExternal(t, {disconnect=false,rejectOrder=false}={}) {
  const oldKey=process.env.COURIER_ENCRYPTION_KEY, oldAdapter=axios.defaults.adapter;
  process.env.COURIER_ENCRYPTION_KEY='22'.repeat(32);t.after(()=>{axios.defaults.adapter=oldAdapter;if(oldKey===undefined)delete process.env.COURIER_ENCRYPTION_KEY;else process.env.COURIER_ENCRYPTION_KEY=oldKey;});
  const connection={enabled:true,connected:true,credentials:encryptCredentials({apiToken:'test'}),environment:'staging',clientName:'Test Client',sellerGst:'36ABCDE1234F1Z5'};
  let connections=0, saved, orderCalls=0;
  t.mock.method(CourierConnection,'findOne',()=>({select:async()=>++connections>1&&disconnect?null:connection}));
  const origin={_id:branchId,branchUniqueId:'ORIGIN',name:'Origin',companyId,city:'Hyderabad',location:'Main',country:'India',pincode:'500001',delhiveryPickupLocation:'Main',ownershipType:'own'};
  t.mock.method(Branch,'findOne',()=>query(origin));t.mock.method(Branch,'find',()=>query([]));
  t.mock.method(Booking,'findOne',filter=>query(filter._id?saved:null));t.mock.method(Booking,'findById',async()=>saved);
  t.mock.method(Booking,'updateOne',async()=>({matchedCount:1}));
  t.mock.method(Counter,'findOneAndUpdate',async()=>({value:1001}));
  const sessions=t.mock.method(mongoose,'startSession',async()=>session);
  const writes=t.mock.method(Company,'updateOne',async()=>({matchedCount:1}));t.mock.method(QuotaEvent,'create',async rows=>rows);
  t.mock.method(Booking.prototype,'save',async function(){saved=this;return this;});
  axios.defaults.adapter=async config=>{
    const response=data=>({status:200,statusText:'OK',headers:{},config,data});
    if(config.url.includes('pin-codes'))return response({postal_codes:[{postal_code:{pin:520001,pre_paid:'Y'}}]});
    if(config.url.includes('invoice/charges'))return response([{total_amount:50}]);
    if(config.url.includes('waybill/api/fetch'))return response('123456789012');
    assert.ok(config.url.includes('cmu/create'));orderCalls++;
    if(rejectOrder)throw {response:{status:401}};
    throw {code:'ECONNABORTED'};
  };
  const body={originId:branchId,category:'domestic',destinationCountry:'India',destinationPostalCode:'520001',toCity:'Vijayawada',receiverState:'Andhra Pradesh',senderName:'Sender',senderMobile:'9999999999',senderAddress:'Origin address',receiverName:'Receiver',receiverMobile:'8888888888',receiverAddress:'Destination address',bookingType:'paid',valueOfGoods:100,hsCode:'4901',shippingInvoice:'INV-1',packages:[{quantity:1,unitPrice:10,weight:1,length:10,width:10,height:10,packageType:'Box',contains:'Books'}],providerKey:'delhivery',courierId:'S',expectedAmount:50};
  return {body,sessions,writes,get saved(){return saved;},get orderCalls(){return orderCalls;}};
}

test('courier disconnect before order creation cannot leave a reserved booking',async t=>{
  const state=mockExternal(t,{disconnect:true});
  await assert.rejects(createShipment({name:'Test Logistics',operatingCategories:'both'},admin,state.body,'external-disconnect'),/purchase and connect/);
  assert.equal(state.sessions.mock.callCount(),0);assert.equal(state.writes.mock.callCount(),0);assert.equal(state.orderCalls,0);
});

test('known provider rejection releases reserved quota; ambiguous order timeout keeps hold for reconciliation',async t=>{
  const state=mockExternal(t,{rejectOrder:true});
  const result=await createShipment({name:'Test Logistics',operatingCategories:'both'},admin,state.body,'external-rejected');
  assert.equal(result.confirmationStatus,'failed');assert.equal(result.quotaStatus,'released');assert.equal(state.orderCalls,1);
  assert.equal(state.writes.mock.callCount(),2);assert.equal(state.writes.mock.calls[0].arguments[1].$inc['bookingQuota.held'],1);assert.equal(state.writes.mock.calls[1].arguments[1].$inc['bookingQuota.held'],-1);
});

test('ambiguous provider timeout retains the hold instead of allowing duplicate shipment capacity',async t=>{
  const state=mockExternal(t);
  const result=await createShipment({name:'Test Logistics',operatingCategories:'both'},admin,state.body,'external-timeout');
  assert.equal(result.confirmationStatus,'pending');assert.equal(result.quotaStatus,'held');assert.equal(state.writes.mock.callCount(),1);assert.equal(state.orderCalls,1);
});
