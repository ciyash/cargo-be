import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { phoneNumber, domesticPhoneFields } from "../src/utils/phone.js";
import { normalizeShipment } from "../src/services/shipping.js";

test('domestic phones accept exactly ten digits and reject malformed or overlong input',()=>{
  assert.equal(phoneNumber('9000000001'),'9000000001');
  assert.equal(phoneNumber(9000000001),'9000000001');
  for(const value of ['900000000','90000000011','+919000000001','90000e0001','90000 0001',{},[],true])assert.throws(()=>phoneNumber(value),/exactly 10/);
});
test('international phone validation retains optional country code and 7–15 digits',()=>{
  assert.equal(phoneNumber('+442071234567','Phone',true),'+442071234567');
  assert.throws(()=>phoneNumber('+1234567890123456','Phone',true),/7–15/);
});
test('contact write boundary rejects invalid phones but leaves optional values, passwords and searches alone',async t=>{
  const app=express();app.use(express.json());app.use(domesticPhoneFields);
  app.all('/contact',(req,res)=>res.json({ok:true}));app.use((error,req,res,next)=>res.status(error.status||500).json({message:error.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const url='http://127.0.0.1:'+server.address().port+'/contact';
  const write=async(method,body)=>{const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});await response.json();return response.status;};
  for(const key of ['phone','mobile','alternateMobile','senderMobile','receiverMobile','workPhone']){
    assert.equal(await write('POST',{[key]:'12345678901'}),400);
    assert.equal(await write('PATCH',{[key]:'9000000001'}),200);
  }
  assert.equal(await write('POST',{phone:'',password:'123456789012345',documents:{phone:'not a contact'}}),200);
  assert.equal((await fetch(url+'?mobile=123')).status,200);
});
test('domestic shipping rejects invalid sender or receiver phones before courier calls',()=>{
  const body={category:'domestic',originId:'origin',destinationCountry:'India',destinationPostalCode:'500001',toCity:'Hyderabad',receiverState:'Telangana',senderName:'Sender',receiverName:'Receiver',senderAddress:'Origin road',receiverAddress:'Destination road',senderMobile:'9999999999',receiverMobile:'8888888888',bookingType:'paid',valueOfGoods:0,packages:[{quantity:1,weight:1,length:1,width:1,height:1,unitPrice:1,packageType:'Box',contains:'Books'}]};
  assert.equal(normalizeShipment(body).senderMobile,'9999999999');
  for(const key of ['senderMobile','receiverMobile'])for(const value of ['123456789','12345678901','+919999999999'])assert.throws(()=>normalizeShipment({...body,[key]:value}),/exactly 10/);
});
