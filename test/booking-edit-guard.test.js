import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Booking} from "../src/models/booking.model.js";
import controller from "../src/controllers/booking.controller.js";
test('booking contact edit atomically requires an unloaded confirmed own parcel in the correct tenant and branch',async t=>{
 let filter;
 t.mock.method(Booking,'findOneAndUpdate',async(query,update)=>{filter=query;assert.deepEqual(update,{receiverName:'Correct receiver'});return null;});
 const res={status(code){this.code=code;return this},json(body){this.body=body;return this}};
 await controller.updateGRNBookings({user:{companyId:'tenant',role:'staff',branchId:'MAIN001'},params:{grnNo:1000},body:{receiverName:'Correct receiver'}},res);
 assert.equal(filter.companyId,'tenant');assert.equal(filter.pickUpBranch,'MAIN001');
 assert.equal(filter.bookingStatus,0);assert.equal(filter.loadingDate,null);assert.equal(filter.confirmationStatus,'confirmed');assert.deepEqual(filter.fulfilment,{$ne:'external'});
 assert.equal(res.code,404);
});
