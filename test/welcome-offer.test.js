import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import Company from "../src/models/company.model.js";
import Payment from "../src/models/payment.model.js";
import { QuotaEvent } from "../src/models/logistics.model.js";
import { createRegisteredCompany, grantExistingCompanies } from "../src/services/welcome-bookings.js";
import { bookingPack } from "../src/services/billing.js";
import { activatePayment, validateCapturedPayment } from "../src/services/razorpay.js";
import { createApp } from "../src/app.js";

const companyId='507f1f77bcf86cd799439011';
function sessionMock(t){const state={ended:0,aborted:0};const session={withTransaction:async work=>{try{return await work();}catch(error){state.aborted++;throw error;}},endSession:async()=>{state.ended++;}};t.mock.method(mongoose,'startSession',async()=>session);return {session,state};}
const query=value=>({select(){return this;},session(){return this;},lean:async()=>value});

test('registration atomically grants 100 free bookings and ignores caller-supplied quota',async t=>{
  const {session,state}=sessionMock(t);let event;
  t.mock.method(Company,'create',async([data],options)=>{assert.equal(options.session,session);assert.equal(data.bookingQuota.purchased,100);assert.equal(data.bookingQuota.freeGranted,100);assert.equal(data.companyAccess,true);return [new Company({_id:companyId,...data})];});
  t.mock.method(QuotaEvent,'create',async(rows,options)=>{assert.equal(options.session,session);event=rows[0];});
  const company=await createRegisteredCompany({name:'New Company',email:'new@example.test',password:'hashed',bookingQuota:{purchased:999999},companyAccess:false});
  assert.equal(company.bookingQuota.purchased,100);assert.equal(company.bookingQuota.used,0);assert.equal(company.bookingQuota.held,0);assert.equal(event.kind,'grant');assert.equal(event.count,100);assert.equal(event.amount,0);assert.equal(event.operationKey,`welcome:${companyId}`);assert.equal(state.ended,1);
});

test('welcome grant audit failure aborts registration instead of leaving an unaudited allowance',async t=>{
  const {state}=sessionMock(t);
  t.mock.method(Company,'create',async()=>[{_id:companyId}]);t.mock.method(QuotaEvent,'create',async()=>{throw Error('Ledger unavailable');});
  await assert.rejects(createRegisteredCompany({name:'New Company'}),/Ledger unavailable/);assert.equal(state.aborted,1);assert.equal(state.ended,1);
});

test('existing companies receive the welcome grant once without resetting purchases, use or holds',async t=>{
  const {session}=sessionMock(t);const row={purchased:1000,used:30,held:2,freeGranted:0};let events=0;
  t.mock.method(Company,'find',filter=>{assert.equal(filter.$or[1]['bookingQuota.freeGranted'],0);return query(row.freeGranted===0?[{_id:companyId}]:[]);});
  t.mock.method(Company,'updateOne',async(filter,update,options)=>{assert.equal(options.session,session);assert.equal(String(filter._id),companyId);row.purchased+=update.$inc['bookingQuota.purchased'];row.freeGranted=update.$set['bookingQuota.freeGranted'];return {matchedCount:1};});
  t.mock.method(QuotaEvent,'create',async()=>{events++;});
  assert.equal((await grantExistingCompanies()).companiesGranted,1);assert.equal((await grantExistingCompanies()).companiesGranted,0);
  assert.deepEqual(row,{purchased:1100,used:30,held:2,freeGranted:100});assert.equal(events,1);
});

function offerEnv(t){const changes={BOOKING_PACK_PRICE_PAISE:'100',BOOKING_PACK_BOOKINGS:'1000',BOOKING_PACK_TEST_OFFER:'true'};const previous=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));Object.assign(process.env,changes);t.after(()=>{for(const [key,value] of Object.entries(previous))value===undefined?delete process.env[key]:process.env[key]=value;});}

test('temporary offer is exactly 100 paise for 1000 bookings, independent of welcome allowance',t=>{offerEnv(t);const pack=bookingPack();assert.equal(pack.amount,100);assert.equal(pack.bookings,1000);assert.equal(pack.currency,'INR');assert.equal(pack.testOffer,true);});

test('Razorpay checkout persists server-priced INR 1 / 1000 order and ignores client price/count',async t=>{
  offerEnv(t);const keys={COMPANY_SECRET:'offer-company-secret',RAZORPAY_KEY_ID:'rzp_test_offerfixture',RAZORPAY_KEY_SECRET:'offer-fixture-secret'};const previous=Object.fromEntries(Object.keys(keys).map(k=>[k,process.env[k]]));Object.assign(process.env,keys);t.after(()=>{for(const [key,value] of Object.entries(previous))value===undefined?delete process.env[key]:process.env[key]=value;});
  const oldAdapter=axios.defaults.adapter;t.after(()=>{axios.defaults.adapter=oldAdapter;});
  axios.defaults.adapter=async config=>{assert.ok(config.url.endsWith('/orders'));const payload=JSON.parse(config.data);assert.equal(payload.amount,100);assert.equal(payload.currency,'INR');return {status:200,statusText:'OK',headers:{},config,data:{id:'order_offer1000',amount:100,currency:'INR'}};};
  t.mock.method(Company,'findById',()=>query({_id:companyId,email:'company@example.test',name:'Test Company',isBlocked:false}));let stored;
  t.mock.method(Payment,'create',async order=>{stored=order;return order;});
  const server=createApp().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const token=jwt.sign({companyId,role:'company'},process.env.COMPANY_SECRET);
  const res=await fetch(`http://127.0.0.1:${server.address().port}/billing/orders`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({purpose:'booking-pack',amount:1,bookings:999999})});
  assert.equal(res.status,201);const body=await res.json();assert.equal(body.amount,100);assert.equal(body.bookings,1000);assert.equal(stored.amount,100);assert.equal(stored.bookings,1000);
});

test('captured INR 1 adds 1000 bookings once on top of the 100 welcome bookings',async t=>{
  let capacity=100,updates=0,events=0;const order={companyId,orderId:'order_offer1000',amount:100,currency:'INR',bookings:1000,purpose:'booking-pack',status:'created',save:async function(){return this;}};
  t.mock.method(Payment,'startSession',async()=>({withTransaction:fn=>fn(),endSession:async()=>{}}));
  t.mock.method(Payment,'findOne',()=>({session:async()=>order}));t.mock.method(Company,'findById',()=>({session:async()=>({_id:companyId})}));
  t.mock.method(Company,'updateOne',async(filter,update)=>{capacity+=update.$inc['bookingQuota.purchased'];updates++;return {matchedCount:1};});
  t.mock.method(QuotaEvent,'create',async rows=>{assert.equal(rows[0].amount,1);assert.equal(rows[0].count,1000);events++;});
  const payment={id:'pay_offer1000',order_id:order.orderId,amount:100,currency:'INR',status:'captured'};
  await activatePayment(order.orderId,payment);await activatePayment(order.orderId,payment);assert.equal(capacity,1100);assert.equal(updates,1);assert.equal(events,1);
  assert.throws(()=>validateCapturedPayment({...payment,amount:1},order),/not captured/);
});
