// Read-only browser verification against the user's running local app; never submits a booking.
import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import Staff from "../src/models/admin.auth.model.js";
import Branch from "../src/models/branch.model.js";
import { Booking } from "../src/models/booking.model.js";
import fs from 'node:fs/promises';
const WebSocket=createRequire(new URL('../../crm-frontend/package.json',import.meta.url))('ws');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let chrome,ws,call;
try{
  await mongoose.connect(process.env.MONGO_URI,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:10000});
  const companyId='6af59b935c7c561d7d332281';
  const account=await Staff.findOne({companyId,role:'admin',name:'admin'}).select('_id role branchId').lean();
  assert.ok(account,'Local Admin account must exist');
  const branches=await Branch.find({companyId}).lean();
  const assigned=branches.find(branch=>String(branch._id)===String(account.branchId));
  const expected=assigned||branches.sort((a,b)=>Number(b.branchType==='main')-Number(a.branchType==='main')||String(a._id).localeCompare(String(b._id)))[0];
  assert.ok(expected,'A company branch is required');
  const token=jwt.sign({id:String(account._id),companyId,role:'admin'},process.env.JWT_SECRET,{expiresIn:'5m'});
  chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-extensions','--disable-gpu','--no-first-run','--remote-debugging-port=9337','--user-data-dir='+new URL('../.browser-logistics',import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'),'about:blank'],{windowsHide:true,stdio:'ignore'});
  let tab;
  for(let i=0;i<100&&!tab;i++){try{tab=(await(await fetch('http://127.0.0.1:9337/json')).json()).find(row=>row.type==='page');}catch{}if(!tab)await pause(100);}
  assert.ok(tab,'Browser must start');
  ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let nextId=0;const pending=new Map();
  call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  ws.onmessage=event=>{const message=JSON.parse(event.data);if(!message.id)return;const item=pending.get(message.id);pending.delete(message.id);message.error?item.reject(Error(message.error.message)):item.resolve(message.result);};
  async function evaluate(expression){const result=await call('Runtime.evaluate',{expression,returnByValue:true});if(result.exceptionDetails)throw Error('Browser evaluation failed');return result.result.value;}
  await call('Page.enable');await call('Runtime.enable');
  await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.origin==="http://localhost:4200"){localStorage.setItem("auth-token",'+JSON.stringify(token)+');localStorage.setItem("auth-user",JSON.stringify({role:"admin"}));}'});
  if(process.argv.includes('--receipt')){
    const booking=await Booking.findOne({companyId,grnNo:1000}).select('grnNo lrNumber grandTotal').lean();assert.ok(booking,'Existing receipt must exist');
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:'http://localhost:4200/printgrn/1000'});
    let receipt;
    for(let i=0;i<200;i++){receipt=await evaluate('(()=>{const paper=document.querySelector(".receipt-paper"),total=document.querySelector(".net-amount strong:last-child");return paper&&total?{text:paper.innerText,total:Number(total.textContent.replace(/[^0-9.-]/g,"")),top:paper.getBoundingClientRect().top,headers:document.querySelectorAll("app-header").length}:null;})()');if(receipt?.text.includes(booking.lrNumber)&&receipt.text.includes('Chandhu Logistics'))break;await pause(100);}
    assert.ok(receipt?.text.includes(booking.lrNumber));assert.equal(receipt.total,booking.grandTotal);assert.equal(receipt.headers,0);assert.ok(receipt.top<250,'Receipt must start near the toolbar');
    await fs.writeFile(new URL('../docs/receipt-preview-desktop.png',import.meta.url),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    await call('Emulation.setEmulatedMedia',{media:'print'});assert.equal(await evaluate('getComputedStyle(document.querySelector(".receipt-toolbar")).display'),'none');assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".receipt-paper")).overflow'),'hidden');
    const pdf=await call('Page.printToPDF',{printBackground:false,preferCSSPageSize:true});await fs.writeFile(new URL('../docs/receipt-print-preview.pdf',import.meta.url),Buffer.from(pdf.data,'base64'));
    await call('Emulation.setEmulatedMedia',{media:'screen'});await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(100);assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Receipt must fit mobile');await fs.writeFile(new URL('../docs/receipt-preview-mobile.png',import.meta.url),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    console.log(JSON.stringify({url:'http://localhost:4200/printgrn/1000',verified:true,existingAmountPreserved:true,mobile:true,printPreview:true}));
  }else{
  const pagePath=process.argv.includes('--loading')?'/parcelloading':'/booking';
  await call('Page.navigate',{url:'http://localhost:4200'+pagePath});
  let values;
  for(let i=0;i<200;i++){
    values=await evaluate('(()=>{const city=document.querySelector("[formControlName=fromCity]"),branch=document.querySelector("[formControlName=pickUpBranch]");return city&&branch?{city:city.value,branch:branch.value,branchName:branch.selectedOptions[0]?.textContent.trim(),cityEditable:!city.disabled,branchEditable:!branch.disabled}:null;})()');
    if(values?.city===expected.city&&values?.branch===expected.branchUniqueId)break;
    await pause(100);
  }
  assert.equal(values?.city,expected.city,'Actual running page must default the company city');
  assert.equal(values?.branch,expected.branchUniqueId,'Actual running page must default the company branch');
  assert.ok(values.cityEditable&&values.branchEditable,'Both defaults must stay editable');
  console.log(JSON.stringify({url:'http://localhost:4200'+pagePath,assignedBranch:Boolean(account.branchId),...values,verified:true}));
  }
}finally{
  if(call&&ws?.readyState===1){await call('Runtime.evaluate',{expression:'localStorage.removeItem("auth-token");localStorage.removeItem("auth-user");'}).catch(()=>{});await call('Browser.close').catch(()=>{});}
  ws?.close();chrome?.kill();await mongoose.disconnect();
}
