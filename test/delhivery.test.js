import { test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import mongoose from 'mongoose';
import { connectDelhivery, delhiveryRequest, delhiveryQuotes, fetchDelhiveryWaybill, delhiveryPayload, placeDelhiveryOrder, delhiveryTracking, delhiveryTrackingState, requestDelhiveryPickup } from "../src/services/delhivery.js";
import { encryptCredentials, decryptCredentials } from "../src/services/courier-secrets.js";
import { providerCatalog } from "../src/services/couriers.js";
import { delhiveryLabel } from "../src/services/delhivery-label.js";
import { cancelShipment, syncTracking, shippingOptions } from "../src/services/shipping.js";
import { CourierConnection, QuotaEvent } from "../src/models/logistics.model.js";
import { Booking } from "../src/models/booking.model.js";
import Branch from "../src/models/branch.model.js";
import Company from "../src/models/company.model.js";

const tenant='507f1f77bcf86cd799439011',id='507f1f77bcf86cd799439012';
const user={companyId:tenant,id,role:'company_admin',name:'Admin'};
const origin={_id:id,branchUniqueId:'HYD',companyId:tenant,city:'Hyderabad',country:'India',pincode:'500001',delhiveryPickupLocation:'Hyderabad HQ'};
const query=value=>({select(){return this;},session(){return this;},lean:async()=>value,then:(resolve,reject)=>Promise.resolve(value).then(resolve,reject)});
const input=()=>({companyId:tenant,grnNo:1001,category:'domestic',originId:id,destinationCountry:'India',destinationPostalCode:'110001',toCity:'Delhi',receiverState:'Delhi',receiverName:'Receiver',receiverMobile:'8888888888',receiverAddress:'Road & Lane',senderName:'Seller',senderAddress:'Origin road',senderMobile:'9999999999',valueOfGoods:1000,hsCode:'4901',shippingInvoice:'INV-1',packages:[{quantity:1,weight:1.25,length:10,width:12,height:15,unitPrice:10,packageType:'Box',contains:'Books & notes'}],provider:{key:'delhivery',awb:'123456789012',courierId:'S',environment:'staging',pickupLocation:'Hyderabad HQ'}});
function adapter(t,handler){const previousKey=process.env.COURIER_ENCRYPTION_KEY,previousAdapter=axios.defaults.adapter;process.env.COURIER_ENCRYPTION_KEY='31'.repeat(32);t.after(()=>{axios.defaults.adapter=previousAdapter;if(previousKey===undefined)delete process.env.COURIER_ENCRYPTION_KEY;else process.env.COURIER_ENCRYPTION_KEY=previousKey;});axios.defaults.adapter=async config=>({status:200,statusText:'OK',headers:{},config,data:await handler(config)});return {environment:'staging',credentials:encryptCredentials({apiToken:'test-api-token'}),clientName:'Test Client',sellerGst:'36ABCDE1234F1Z5',connected:true,enabled:true};}

test('new courier catalogue exposes Delhivery only and does not invent a wallet balance API',()=>{assert.deepEqual(providerCatalog().map(p=>p.key),['delhivery']);assert.equal(providerCatalog()[0].wallet,false);assert.equal(providerCatalog()[0].portalUrl,'https://one.delhivery.com/');});

test('company connection verifies rate access and encrypts the token under that tenant',async t=>{
  adapter(t,config=>{assert.equal(config.headers.Authorization,'Token test-api-token');assert.equal(config.baseURL,'https://staging-express.delhivery.com');return [{total_amount:60}];});
  let saved;t.mock.method(CourierConnection,'findOneAndUpdate',async(filter,update)=>{assert.deepEqual(filter,{companyId:tenant,providerKey:'delhivery'});saved=update.$set;return {...saved,enabled:false};});
  const result=await connectDelhivery(tenant,{apiToken:'test-api-token',environment:'staging',clientName:'Test Client',sellerGst:'36ABCDE1234F1Z5',testPin:'500001'});
  assert.equal(result.enabled,false);assert.equal(result.connected,true);assert.equal(result.apiToken,undefined);assert.ok(!saved.credentials.includes('test-api-token'));assert.deepEqual(decryptCredentials(saved.credentials),{apiToken:'test-api-token'});
});

test('invalid connection inputs fail before provider calls or database writes',async t=>{
  let calls=0;adapter(t,()=>{calls++;return [];});
  const base={apiToken:'test',environment:'staging',clientName:'Client',sellerGst:'36ABCDE1234F1Z5'};
  for(const change of [{environment:'https://evil.example'},{apiToken:'Token secret'},{sellerGst:'bad'},{clientName:''}])await assert.rejects(connectDelhivery(tenant,{...base,...change}));
  assert.equal(calls,0);
});

test('requests use fixed HTTPS hosts, Token authentication and redact provider error bodies',async t=>{
  const connection=adapter(t,config=>{assert.equal(config.maxRedirects,0);assert.equal(config.headers.Authorization,'Token test-api-token');throw {response:{status:401,data:{token:'never-echo-this'}}};});
  await assert.rejects(delhiveryRequest(connection,'GET','/c/api/pin-codes/json/'),error=>error.status===403&&error.definitive===true&&!error.message.includes('never-echo'));
  await assert.rejects(delhiveryRequest({...connection,environment:'https://evil.example'},'GET','/'),/environment/);
});

test('manifestation 400 errors remain ambiguous because Delhivery can partially save packages',async t=>{
  const connection=adapter(t,()=>{throw {response:{status:400}};});
  await assert.rejects(delhiveryRequest(connection,'POST','/api/cmu/create.json',{data:'format=json&data=x',form:true}),error=>error.definitive===false);
});

test('quotes require prepaid PIN coverage and return sorted Surface/Express estimates in INR',async t=>{
  const calls=[];const connection=adapter(t,config=>{calls.push(config);if(config.url.includes('pin-codes'))return {postal_codes:[{postal_code:{pin:110001,pre_paid:'Y'}}]};assert.equal(config.params.cgm,1250);assert.equal(config.params.o_pin,'500001');assert.equal(config.params.d_pin,'110001');return [{total_amount:config.params.md==='S'?50.25:80.5}];});
  const rows=await delhiveryQuotes(connection,input(),origin);assert.deepEqual(rows.map(r=>[r.courierId,r.amount,r.estimated]),[['S',50.25,true],['E',80.5,true]]);assert.equal(calls.length,3);
});

test('nonserviceable PIN returns no rate and unsupported parcel/category never calls the API',async t=>{
  let calls=0;const connection=adapter(t,()=>{calls++;return {postal_codes:[{postal_code:{pin:110001,pre_paid:'N'}}]};});
  assert.deepEqual(await delhiveryQuotes(connection,input(),origin),[]);assert.equal(calls,1);
  for(const change of [{category:'international'},{packages:[{...input().packages[0],quantity:2}]}])await assert.rejects(delhiveryQuotes(connection,{...input(),...change},origin));
  await assert.rejects(delhiveryQuotes(connection,input(),{...origin,delhiveryPickupLocation:''}),/map this branch/);assert.equal(calls,1);
});

test('missing rate data cannot be converted into a free courier quote',async t=>{
  const connection=adapter(t,config=>config.url.includes('pin-codes')?{postal_codes:[{postal_code:{pin:110001,pre_paid:'Y'}}]}:[{total_amount:null}]);
  await assert.rejects(delhiveryQuotes(connection,input(),origin),/usable rate/);
});

test('waybill allocation preserves provider reference before manifestation and validates AWB',async t=>{
  const connection=adapter(t,config=>{assert.equal(config.params.cl,'Test Client');return '012345678901';});assert.equal(await fetchDelhiveryWaybill(connection),'012345678901');
});

test('manifestation encodes the documented form body and uses goods value rather than freight',async t=>{
  const booking=input();const connection=adapter(t,config=>{assert.equal(config.headers['Content-Type'],'application/x-www-form-urlencoded');const form=new URLSearchParams(config.data);assert.equal(form.get('format'),'json');const body=JSON.parse(form.get('data'));assert.equal(body.pickup_location.name,'Hyderabad HQ');assert.equal(body.shipments[0].products_desc,'Books & notes');assert.equal(body.shipments[0].weight,1250);assert.equal(body.shipments[0].order,tenant+'-1001');assert.equal(body.shipments[0].total_amount,1000);assert.equal(body.shipments[0].cod_amount,0);return {success:true,packages:[{waybill:booking.provider.awb,status:'Success'}]};});
  const result=await placeDelhiveryOrder(connection,booking,origin);assert.equal(result.awb,booking.provider.awb);
  await assert.rejects(placeDelhiveryOrder(connection,{...booking,hsCode:''},origin),/HSN/);
  assert.throws(()=>delhiveryPayload(connection,{...booking,valueOfGoods:50001,goodsEwaybill:'EWB-generated'},origin),/actual 12-digit/);
});

test('tracking matches the saved AWB and validates the company order reference',async t=>{
  const booking=input();const connection=adapter(t,()=>({ShipmentData:[{Shipment:{AWB:booking.provider.awb,ReferenceNo:'other-company-1001'}}]}));
  await assert.rejects(delhiveryTracking(connection,booking),/does not match/);
  await assert.rejects(delhiveryTracking({...connection,environment:'production'},booking),/environment used/);
});

test('status mapping never treats unknown or moved parcels as safe cancellations',()=>{
  assert.equal(delhiveryTrackingState({Status:{Status:'Manifested'}}).picked,false);
  assert.equal(delhiveryTrackingState({Status:{Status:'Unrecognised status'}}).picked,true);
  assert.equal(delhiveryTrackingState({Status:{Status:'Returned'}}).cancelled,false);
  assert.equal(delhiveryTrackingState({Status:{Status:'Returned'}},{cancellationRequested:true}).cancelled,true);
  assert.equal(delhiveryTrackingState({Status:{Status:'Returned',StatusType:'RT'}},{cancellationRequested:true}).cancelled,false);
  const moved=delhiveryTrackingState({Status:{Status:'Returned'},PickedupDate:'2026-11-12',Scans:[{ScanDetail:{Scan:'In Transit'}}]});assert.equal(moved.picked,true);assert.equal(moved.cancelled,false);
});

test('packing slip creates an escaped printable label with a Code 128 AWB barcode',()=>{
  const booking={...input(),receiverName:'<script>bad()</script>',lrNumber:'QA/1001',pickupPostalCode:'500001'};
  const html=delhiveryLabel(booking,{sellerGst:'36ABCDE1234F1Z5'},{packages:[{wbn:booking.provider.awb,sort_code:'DEL/01'}]});
  assert.ok(html.includes('<svg'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>bad'));assert.ok(html.includes('DEL/01'));assert.ok(!html.includes('api-token'));
});

test('own routing does not call Delhivery and international fallback is explicit',async t=>{
  let calls=0;adapter(t,()=>{calls++;throw Error('must not call');});
  t.mock.method(Branch,'findOne',()=>query(origin));t.mock.method(Branch,'find',()=>query([{_id:'507f1f77bcf86cd799439099',name:'Delhi',branchUniqueId:'DEL',city:'Delhi',country:'India',pincode:'110001'}]));
  const result=await shippingOptions({operatingCategories:'both',name:'Company'},user,input());assert.equal(result.route.own,true);assert.equal(result.quotes[0].providerKey,'own');assert.equal(calls,0);
});

function trackingMocks(t,{pending=false,moved=false}={}){
  let status=moved?'In Transit':'Manifested',picked=moved;const writes=[];
  const booking={...input(),_id:id,bookbranchid:id,pickUpBranch:'HYD',dropBranch:'EXTERNAL',fulfilment:'external',bookingType:'paid',grandTotal:50,bookingStatus:0,quotaStatus:pending?'held':'consumed',confirmationStatus:pending?'pending':'confirmed',trackingEvents:[],save:async function(){return this;}};
  const connection=adapter(t,config=>{if(config.url==='/api/p/edit'){status='Returned';return {status:true};}return {ShipmentData:[{Shipment:{AWB:booking.provider.awb,ReferenceNo:tenant+'-1001',Status:{Status:status},...(picked?{PickedupDate:'2026-11-12'}:{})}}]};});
  t.mock.method(CourierConnection,'findOne',()=>query(connection));t.mock.method(Booking,'findOne',()=>query(booking));
  t.mock.method(Booking,'updateOne',async(filter,update)=>{if(update.$set?.['provider.cancelPending'])booking.provider.cancelPending=true;return {matchedCount:1};});
  t.mock.method(mongoose,'startSession',async()=>({withTransaction:fn=>fn(),endSession:async()=>{}}));t.mock.method(Branch,'findOne',()=>query({...origin,ownershipType:'own'}));t.mock.method(Company,'updateOne',async(filter,update)=>{writes.push(update);return {matchedCount:1};});t.mock.method(QuotaEvent,'create',async()=>[]);
  return {booking,writes};
}

test('pending AWB reconciliation consumes a hold only once',async t=>{const {booking,writes}=trackingMocks(t,{pending:true});await syncTracking(user,id);await syncTracking(user,id);assert.equal(booking.confirmationStatus,'confirmed');assert.equal(booking.quotaStatus,'consumed');assert.equal(writes.length,1);assert.equal(writes[0].$inc['bookingQuota.held'],-1);});
test('stale UI cannot cancel a parcel already picked up at Delhivery',async t=>{const {booking,writes}=trackingMocks(t,{moved:true});await assert.rejects(cancelShipment(user,{_id:id}),/pickup\/movement/);assert.equal(booking.provider.pickedUp,true);assert.equal(writes.length,0);});
test('confirmed pre-pickup cancellation restores count and full freight once',async t=>{const {booking,writes}=trackingMocks(t);await cancelShipment(user,{_id:id});await cancelShipment(user,{_id:id});assert.equal(booking.bookingStatus,5);assert.equal(booking.refundAmount,50);assert.equal(booking.quotaStatus,'restored');assert.equal(writes.length,1);});
test('pickup schedule requires a future valid date and time before submitting',async t=>{let calls=0;const connection=adapter(t,()=>{calls++;return {pickup_id:'PICKUP-1'};});await assert.rejects(requestDelhiveryPickup(connection,input(),{date:'2020-01-01',time:'10:00:00'}),/future/);assert.equal(calls,0);});
