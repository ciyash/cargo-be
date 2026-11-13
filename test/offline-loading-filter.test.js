import { test } from 'node:test';
import assert from 'node:assert/strict';
import controller from "../src/controllers/parcel.loading.controller.js";
import { Booking } from "../src/models/booking.model.js";
import unloadingController from "../src/controllers/parcel.unloading.controller.js";

const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
test('offline loading uses validated dates and preserves company and route filters',async()=>{
  const originalFind=Booking.find,originalAggregate=Booking.aggregate;
  let captured;
  const row={grnNo:1000};
  Booking.find=filter=>{
    captured=filter;
    const query={model:Booking,getFilter:()=>filter,getOptions:()=>({sort:{_id:1}}),cast:()=>filter,sort(){return this;},skip(){return this;},limit(){return this;},lean:async()=>[row]};
    return query;
  };
  Booking.aggregate=async()=>[{totalRecords:1}];
  try{
    const res=response();
    await controller.getBookingsBetweenDates({user:{companyId:'company-a'},body:{startDate:'2026-11-12',endDate:'2026-11-13',fromCity:'Hyderabad',pickUpBranch:'HYLA2334'},query:{}},res);
    assert.equal(res.statusCode,200);
    assert.deepEqual(res.body.data,[row]);
    assert.equal(captured.companyId,'company-a');
    assert.equal(captured.pickUpBranch,'HYLA2334');
    assert.equal(captured.bookingStatus,0);
    assert.ok(captured.fromCity.test('Hyderabad'));
    assert.ok(captured.bookingDate.$gte instanceof Date);
    assert.ok(captured.bookingDate.$lte>captured.bookingDate.$gte);
  }finally{Booking.find=originalFind;Booking.aggregate=originalAggregate;}
});
test('offline loading rejects reversed dates with 400',async()=>{
  const res=response();
  await controller.getBookingsBetweenDates({user:{companyId:'company-a'},body:{startDate:'2026-11-13',endDate:'2026-11-12'}},res);
  assert.equal(res.statusCode,400);
  assert.match(res.body.message,/Start date/);
});

test('unloading filters incoming loaded bookings by destination, origin cities and vehicle',async()=>{
 const originalFind=Booking.find,originalAggregate=Booking.aggregate;
 let captured;
 Booking.find=filter=>{captured=filter;return {model:Booking,getFilter:()=>filter,getOptions:()=>({sort:{_id:1}}),cast:()=>filter,sort(){return this;},skip(){return this;},limit(){return this;},lean:async()=>[{grnNo:1000,bookingStatus:1}]};};
 Booking.aggregate=async()=>[{totalRecords:1}];
 try{
  const res=response();
  await unloadingController.getParcelsLoading({user:{companyId:'company-a'},query:{},body:{fromDate:'2026-11-12',toDate:'2026-11-13',fromCity:['Hyderabad'],toCity:'Vijayawada',branch:'VJA001',vehicalNumber:'TS01AB1234',bookingStatus:0}},res);
  assert.equal(res.statusCode,200);assert.equal(res.body.data.length,1);
  assert.equal(captured.companyId,'company-a');assert.equal(captured.bookingStatus,1);
  assert.equal(captured.dropBranch,'VJA001');assert.equal(captured.vehicalNumber,'TS01AB1234');
  assert.ok(captured.fromCity.$in[0].test('hyderabad'));assert.ok(captured.toCity.test('VIJAYAWADA'));
  assert.ok(captured.loadingDate.$gte instanceof Date);
 }finally{Booking.find=originalFind;Booking.aggregate=originalAggregate;}
});
