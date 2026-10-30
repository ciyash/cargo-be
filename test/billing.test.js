import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import Company from '../models/company.model.js';
import Payment from '../models/payment.model.js';
import { Booking } from '../models/booking.model.js';
import { entitlement, saveBillableBooking, PERIOD_MS } from '../services/billing.js';
import { signatureValid, validateCapturedPayment, activatePayment } from '../services/razorpay.js';
import { createApp } from '../app.js';

test('100 lifetime free bookings; paid unlimited; expiry and blocked state enforced', () => {
  const now = new Date('2026-10-30T00:00:00Z');
  assert.equal(entitlement({}, 99, now).canBook, true);
  assert.equal(entitlement({}, 100, now).canBook, false);
  assert.equal(entitlement({}, 1000, now).freeBookingsRemaining, 0);
  assert.equal(entitlement({ billing: { freeBookingsUsed: 100 } }, 0, now).canBook, false);
  assert.equal(entitlement({ subscription: { validTill: '2099-01-01' } },100,now).paid,false);
  assert.equal(entitlement({ billing: { freeBookingsUsed:100, paidUntil:'2026-11-01' } },0,now).canBook,true);
  assert.equal(entitlement({ billing: { freeBookingsUsed:100, paidUntil:now } },0,now).canBook,false);
  assert.equal(entitlement({ isBlocked:true, billing:{paidUntil:'2099-01-01'} },0,now).canBook,false);
});
test('payment signatures reject forged, missing and malformed values', () => {
  const payload = 'order_123|pay_123';
  const sig = createHmac('sha256','secret').update(payload).digest('hex');
  assert.equal(signatureValid(payload,sig,'secret'),true);
  for(const value of [undefined, 'bad', '0'.repeat(64)]) assert.equal(signatureValid(payload,value,'secret'),false);
  assert.equal(signatureValid('order_other|pay_123',sig,'secret'),false);
});
const captured = {id:'pay_123',order_id:'order_123',amount:100000,currency:'INR',status:'captured',amount_refunded:0};
test('only captured INR 1000 payments for the stored order qualify', () => {
  validateCapturedPayment(captured,{orderId:'order_123'});
  for(const changes of [{amount:1000},{currency:'USD'},{status:'authorized'},{order_id:'order_other'},{amount_refunded:1},{refunded:true}]) assert.throws(()=>validateCapturedPayment({...captured,...changes},{orderId:'order_123'}),/not captured/);
});
test('last free booking writes usage and booking in one transaction; limit prevents next save', async t => {
  const session = { withTransaction: fn => fn(), endSession: async () => {} };
  let used = 99, saves = 0;
  t.mock.method(Company,'startSession',async()=>session);
  t.mock.method(Company,'findById',()=>({session: actual => {assert.equal(actual,session); return {lean:async()=>({_id:'company',billing:{freeBookingsUsed:used}})};}}));
  t.mock.method(Company,'updateOne',async(filter,update,options)=>{assert.equal(options.session,session);used=update.$set['billing.freeBookingsUsed'];});
  t.mock.method(Booking.prototype,'save',async function(options){assert.equal(options.session,session);saves++;return this;});
  const booking = {toObject:()=>({companyId:'507f1f77bcf86cd799439011'})};
  await saveBillableBooking(booking); assert.equal(used,100); assert.equal(saves,1);
  await assert.rejects(saveBillableBooking(booking),error=>error.status===402); assert.equal(saves,1);
});
test('paid booking does not consume free allowance; failed insert propagates and closes session', async t => {
  let ended = false;
  const session = {withTransaction:fn=>fn(),endSession:async()=>{ended=true;}};
  t.mock.method(Company,'startSession',async()=>session);
  t.mock.method(Company,'findById',()=>({session:()=>({lean:async()=>({_id:'company',billing:{freeBookingsUsed:100,paidUntil:new Date(Date.now()+PERIOD_MS)}})})}));
  t.mock.method(Company,'updateOne',async(filter,update)=>assert.equal(update.$set['billing.freeBookingsUsed'],100));
  t.mock.method(Booking.prototype,'save',async()=>{throw new Error('insert failed');});
  await assert.rejects(saveBillableBooking({toObject:()=>({})}),/insert failed/); assert.equal(ended,true);
});
test('payment activation is idempotent and renews from existing paid expiry', async t => {
  const session = {withTransaction:fn=>fn(),endSession:async()=>{}};
  const expiry = new Date(Date.now()+PERIOD_MS); let updates=0;
  const order = {orderId:'order_123',companyId:'company',status:'created',async save(){return this;}};
  t.mock.method(Payment,'startSession',async()=>session);
  t.mock.method(Payment,'findOne',()=>({session:async()=>order}));
  t.mock.method(Company,'findById',()=>({session:async()=>({_id:'company',billing:{paidUntil:expiry}})}));
  t.mock.method(Company,'updateOne',async(filter,update,options)=>{assert.equal(options.session,session);assert.equal(update.$set['billing.paidUntil'].getTime(),expiry.getTime()+PERIOD_MS);updates++;});
  await activatePayment('order_123',captured); await activatePayment('order_123',captured);
  assert.equal(order.status,'paid');assert.equal(updates,1);
});
test('HTTP billing rejects unauthenticated and staff payment access; legacy upgrade blocked', async t => {
  const server = createApp().listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const staff=jwt.sign({id:'staff',companyId:'company',role:'admin'},process.env.JWT_SECRET);
  const company=jwt.sign({companyId:'company',role:'company'},process.env.COMPANY_SECRET);
  for(const path of ['/billing/status','/billing/history']) assert.equal((await fetch(base+path)).status,401);
  assert.equal((await fetch(base+'/billing/orders',{method:'POST',headers:{Authorization:'Bearer '+staff}})).status,401);
  assert.equal((await fetch(base+'/company/subscription',{method:'POST',headers:{Authorization:'Bearer '+company}})).status,410);
});
