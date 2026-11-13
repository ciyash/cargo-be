import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Company from "../src/models/company.model.js";
import Branch from "../src/models/branch.model.js";
import Payment from "../src/models/payment.model.js";
import { QuotaEvent, CourierConnection } from "../src/models/logistics.model.js";
import { quotaSummary, changeQuota, transaction, allocateFranchise } from "../src/services/quota.js";
import { entitlement } from "../src/services/billing.js";
import { normalizeShipment, shipmentScope, cancelShipment, ownOperation, syncTracking } from "../src/services/shipping.js";
import axios from 'axios';
import { encryptCredentials, decryptCredentials, providerCatalog } from "../src/services/couriers.js";
import { activatePayment, validateCapturedPayment, signatureValid } from "../src/services/razorpay.js";
import { createHmac } from 'node:crypto';

test('company holds reduce available capacity; legacy subscriptions never create quota',()=>{
  assert.deepEqual(quotaSummary({purchased:10,used:6,held:2}),{total:10,used:6,held:2,remaining:4,available:2});
  assert.equal(entitlement({bookingQuota:{purchased:1,held:1},billing:{paidUntil:'2099-01-01'}}).canBook,false);
  assert.equal(entitlement({bookingQuota:{purchased:20},isBlocked:true}).canBook,false);
});

test('franchise reservation consumes both counters, confirmation moves holds, cancel restores exactly once',async t=>{
  const writes=[],events=[];
  t.mock.method(Branch,'findOne',()=>({session:()=>({lean:async()=>({_id:'branch',ownershipType:'franchise'})})}));
  t.mock.method(Company,'updateOne',async(filter,update)=>{writes.push({type:'company',filter,update});return {matchedCount:1};});
  t.mock.method(Branch,'updateOne',async(filter,update)=>{writes.push({type:'branch',filter,update});return {matchedCount:1};});
  t.mock.method(QuotaEvent,'create',async rows=>{events.push(...rows);return rows;});
  const b={_id:'booking',companyId:'tenant',bookbranchid:'branch',quotaStatus:'none'};
  assert.equal(await changeQuota(b,'reserve',{}),true);assert.equal(b.quotaStatus,'held');
  assert.ok(writes[0].filter.$expr);assert.ok(writes[1].filter.$expr);
  assert.equal(writes[0].update.$inc['bookingQuota.held'],1);
  await changeQuota(b,'consume',{});assert.equal(b.quotaStatus,'consumed');
  assert.equal(writes[2].update.$inc['bookingQuota.held'],-1);assert.equal(writes[2].update.$inc['bookingQuota.used'],1);
  await changeQuota(b,'restore',{});assert.equal(b.quotaStatus,'restored');
  assert.equal(await changeQuota(b,'restore',{}),false);
  assert.equal(writes.length,6);assert.deepEqual(events.map(e=>e.kind),['reserve','consume','restore']);
});

test('exhausted company rejects before touching franchise allowance',async t=>{
  t.mock.method(Branch,'findOne',()=>({session:()=>({lean:async()=>({_id:'branch',ownershipType:'franchise'})})}));
  t.mock.method(Company,'updateOne',async()=>({matchedCount:0}));
  const branch=t.mock.method(Branch,'updateOne',async()=>assert.fail('must not mutate branch'));
  await assert.rejects(changeQuota({_id:'b',companyId:'c',bookbranchid:'branch'},'consume',{}),/quota exhausted/);
  assert.equal(branch.mock.calls.length,0);
});

test('transactions close their session after failure',async t=>{
  let ended=false;
  t.mock.method(mongoose,'startSession',async()=>({withTransaction:async fn=>fn(),endSession:async()=>{ended=true;}}));
  await assert.rejects(transaction(async()=>{throw Error('rollback');}),/rollback/);assert.ok(ended);
});

test('franchise allowance fits company balance without consuming quota and is idempotent',async t=>{
  const saved=[];
  t.mock.method(mongoose,'startSession',async()=>({withTransaction:async fn=>fn(),endSession:async()=>{}}));
  t.mock.method(QuotaEvent,'findOne',()=>({session:async()=>saved[0]}));
  const branch=t.mock.method(Branch,'updateOne',async()=>({matchedCount:1}));
  t.mock.method(Company,'findById',()=>({select:()=>({session:()=>({lean:async()=>({bookingQuota:{purchased:20000}})})})}));
  t.mock.method(Branch,'find',()=>({select:()=>({session:()=>({lean:async()=>[]})})}));
  const company=t.mock.method(Company,'updateOne',async(filter,update)=>{assert.deepEqual(update,{$inc:{'bookingQuota.revision':1}});return {matchedCount:1};});
  t.mock.method(QuotaEvent,'create',async rows=>{saved.push(...rows);return rows;});
  const input={bookings:20000,amount:1234,requestKey:'allocation-001'};
  await allocateFranchise('tenant','branch',input,'admin');await allocateFranchise('tenant','branch',input,'admin');
  assert.equal(branch.mock.calls.length,1);assert.equal(company.mock.calls.length,1);
  await assert.rejects(allocateFranchise('tenant','branch',{...input,bookings:1},'admin'),/already used/);
});

test('captured payments validate immutable order amount and signatures',()=>{
  const order={orderId:'order1',amount:78900,currency:'INR'};
  const payment={id:'pay1',order_id:'order1',amount:78900,currency:'INR',status:'captured'};
  validateCapturedPayment(payment,order);
  for(const changed of [{amount:500000},{status:'authorized'},{refunded:true},{amount_refunded:1},{order_id:'other'}])assert.throws(()=>validateCapturedPayment({...payment,...changed},order));
  const hash=createHmac('sha256','secret').update('order1|pay1').digest('hex');
  assert.ok(signatureValid('order1|pay1',hash,'secret'));assert.equal(signatureValid('changed',hash,'secret'),false);
});

test('payment replay adds purchased bookings once; service payments enable only that company',async t=>{
  const order={companyId:'tenant',orderId:'order1',amount:500000,currency:'INR',bookings:10000,purpose:'booking-pack',status:'created',save:async function(){return this;}};
  const updates=[],services=[];
  t.mock.method(Payment,'startSession',async()=>({withTransaction:async fn=>fn(),endSession:async()=>{}}));
  t.mock.method(Payment,'findOne',()=>({session:async()=>order}));
  t.mock.method(Company,'findById',()=>({session:async()=>({_id:'tenant'})}));
  t.mock.method(Company,'updateOne',async(filter,update)=>{updates.push({filter,update});return {matchedCount:1};});
  t.mock.method(QuotaEvent,'create',async rows=>rows);
  t.mock.method(CourierConnection,'updateOne',async(filter,update)=>{services.push({filter,update});});
  const payment={id:'pay1',order_id:'order1',amount:500000,currency:'INR',status:'captured'};
  await activatePayment('order1',payment);await activatePayment('order1',payment);
  assert.equal(updates.length,1);assert.equal(updates[0].update.$inc['bookingQuota.purchased'],10000);
  Object.assign(order,{purpose:'service',providerKey:'delhivery',status:'created'});
  await activatePayment('order1',payment);
  assert.deepEqual(services[0].filter,{companyId:'tenant',providerKey:'delhivery'});assert.equal(updates.length,1);
});

test('courier credentials are authenticated encryption; unsupported providers are explicit',()=>{
  const previous=process.env.COURIER_ENCRYPTION_KEY;process.env.COURIER_ENCRYPTION_KEY='ab'.repeat(32);
  try{const source={email:'api@example.test',password:'test-password'};const encrypted=encryptCredentials(source);assert.ok(!encrypted.includes(source.password));assert.deepEqual(decryptCredentials(encrypted),source);const parts=encrypted.split('.');const tag=Buffer.from(parts[1],'base64');tag[0]^=1;parts[1]=tag.toString('base64');assert.throws(()=>decryptCredentials(parts.join('.')));assert.deepEqual(providerCatalog().map(p=>p.key),['delhivery']);}finally{if(previous===undefined)delete process.env.COURIER_ENCRYPTION_KEY;else process.env.COURIER_ENCRYPTION_KEY=previous;}
});

const input=()=>({originId:'origin',category:'domestic',destinationCountry:'India',destinationPostalCode:'500001',toCity:'Hyderabad',receiverState:'Telangana',senderName:'Sender',senderMobile:'9999999999',senderAddress:'Origin address',receiverName:'Receiver',receiverMobile:'8888888888',receiverAddress:'Destination address',valueOfGoods:1000,bookingType:'paid',serviceCharges:5,packages:[{packageType:'Box',contains:'Books',quantity:2,weight:1,length:10,width:20,height:30,unitPrice:50}]});
test('own freight is calculated server side; FOC still has goods value',()=>{
  assert.equal(normalizeShipment({...input(),grandTotal:1}).grandTotal,105);
  const free=normalizeShipment({...input(),bookingType:'FOC'});assert.equal(free.grandTotal,0);assert.equal(free.valueOfGoods,1000);
  assert.throws(()=>normalizeShipment({...input(),packages:[{...input().packages[0],quantity:0}]}),/positive/);
  assert.throws(()=>normalizeShipment({...input(),bookingType:'credit'}),/credit party/);
});
test('international booking requires declaration and verified attachment format',()=>{
  const international={purpose:'Goods',invoice:'INV001',hsCode:'123456',duties:'Sender',documents:[{name:'invoice.pdf',data:Buffer.from('%PDF-1.4\ntest').toString('base64')}]};
  assert.equal(normalizeShipment({...input(),category:'international',international}).international.documents[0].mime,'application/pdf');
  assert.throws(()=>normalizeShipment({...input(),category:'international',international:{...international,documents:[{name:'bad.pdf',data:'YmFk'}]}}),/Documents/);
});
test('shipment access always has tenant scope and unassigned staff cannot see every branch',()=>{
  assert.deepEqual(shipmentScope({companyId:'tenant',role:'company'}),{companyId:'tenant'});
  const scope=shipmentScope({companyId:'tenant',role:'staff'});assert.equal(scope.companyId,'tenant');assert.ok(scope.$or.every(f=>Object.values(f)[0]==='__unassigned__'));
});

test('actual own cancellation restores once and rejects destination staff or loaded shipments',async t=>{
  const { Booking }=await import("../src/models/booking.model.js");
  const b={_id:'shipment',companyId:'tenant',bookbranchid:'branch',pickUpBranch:'ORIGIN',dropBranch:'DEST',bookingType:'paid',grandTotal:200,fulfilment:'own',confirmationStatus:'confirmed',quotaStatus:'consumed',bookingStatus:0,trackingEvents:[],save:async function(){return this;}};
  const user={companyId:'tenant',role:'staff',branchId:'ORIGIN',id:'staff'};
  t.mock.method(Booking,'findOne',filter=>{assert.equal(filter.companyId,'tenant');return {then:(resolve,reject)=>Promise.resolve(b).then(resolve,reject),session:async()=>b};});
  t.mock.method(mongoose,'startSession',async()=>({withTransaction:async fn=>fn(),endSession:async()=>{}}));
  t.mock.method(Branch,'findOne',()=>({session:()=>({lean:async()=>({_id:'branch',ownershipType:'own'})})}));
  const writes=t.mock.method(Company,'updateOne',async()=>({matchedCount:1}));
  t.mock.method(QuotaEvent,'create',async rows=>rows);
  await assert.rejects(cancelShipment({...user,branchId:'DEST'},{_id:b._id}),/booking branch/);
  await cancelShipment(user,{_id:b._id});await cancelShipment(user,{_id:b._id});
  assert.equal(b.bookingStatus,5);assert.equal(b.refundAmount,200);assert.equal(b.quotaStatus,'restored');assert.equal(writes.mock.calls.length,1);
  Object.assign(b,{bookingStatus:0,confirmationStatus:'confirmed',quotaStatus:'consumed'});
  await ownOperation(user,b._id,{action:'load',vehicle:'TS09TEST',driver:'Driver'});
  assert.equal(b.bookingStatus,1);assert.ok(b.loadingDate);
  await assert.rejects(cancelShipment(user,{_id:b._id}),/Loading/);assert.equal(writes.mock.calls.length,1);
});

test('retired courier tracking is rejected before any database update',async t=>{
 const {Booking}=await import('../src/models/booking.model.js');
 const b={_id:'shipment',companyId:'tenant',fulfilment:'external',provider:{key:'retired-provider',awb:'123456789012'},bookingStatus:0};
 t.mock.method(Booking,'findOne',async()=>b);
 const find=t.mock.method(CourierConnection,'findOne',()=>{throw Error('Retired provider must not query credentials')});
 const update=t.mock.method(Booking,'updateOne',()=>{throw Error('Retired provider must not change bookings')});
 await assert.rejects(syncTracking({companyId:'tenant',role:'company'},b._id),error=>error.status===422);
 assert.equal(find.mock.callCount(),0);assert.equal(update.mock.callCount(),0);assert.equal(b.bookingStatus,0);
});


test('franchise allocation rejects 1000 against 500 and counts all existing unused allowances',async t=>{
  t.mock.method(mongoose,'startSession',async()=>({withTransaction:async fn=>fn(),endSession:async()=>{}}));
  t.mock.method(QuotaEvent,'findOne',()=>({session:async()=>null}));
  t.mock.method(Company,'findById',()=>({select:()=>({session:()=>({lean:async()=>({bookingQuota:{purchased:1000,used:400,held:100}})})})}));
  let branches=[];
  t.mock.method(Branch,'find',()=>({select:()=>({session:()=>({lean:async()=>branches})})}));
  t.mock.method(Company,'updateOne',async()=>({matchedCount:1}));
  const writes=t.mock.method(Branch,'updateOne',async()=>({matchedCount:1}));
  t.mock.method(QuotaEvent,'create',async rows=>rows);
  const input={bookings:1000,amount:99999,requestKey:'allocation-limit-test'};
  await assert.rejects(allocateFranchise('tenant','branch',input,'admin'),error=>error.status===409&&/500 available bookings/.test(error.message));
  assert.equal(writes.mock.calls.length,0);
  branches=[{franchiseQuota:{allocated:400,used:50,held:50}}];
  await assert.rejects(allocateFranchise('tenant','branch',{...input,bookings:201},'admin'),/allocate 200 more/);
  await allocateFranchise('tenant','branch',{...input,bookings:200},'admin');
  assert.equal(writes.mock.calls.length,1);
});
