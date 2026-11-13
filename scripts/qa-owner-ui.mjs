// Isolated Ciyash owner UI check. All API data is mocked; no DB or credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve('public/owner');let signedIn=false;const requests=[];
const company={_id:'qa',name:'Chandhu Logistics',email:'qa@example.test',state:'Telangana',operatingCategories:'both',status:'active',quota:{total:1100,used:210,held:10,available:880},branches:6,franchises:1,bookings:125};
const report={generatedAt:new Date().toISOString(),paymentMode:'test',summary:{total:12,active:9,blocked:1,exhausted:2,available:8850,used:2140,held:110,granted:11100,registrations:3,branches:42,franchises:14,franchiseAllocated:2800,franchiseUsed:700,bookings:1245,cancelled:12,external:450,international:36,pendingPayments:2},revenue:[{_id:'INR',amount:650000,bookingPacks:600000,services:50000}],couriers:[{_id:'staging',connected:4,enabled:5},{_id:'production',connected:2,enabled:2}],trends:[{_id:'2026-11-01',count:1},{_id:'2026-11-07',count:2}],companies:[company],recentPayments:[{companyId:{name:company.name},purpose:'booking-pack',amount:100,currency:'INR',bookings:1000,status:'paid',createdAt:'2026-11-12',paidAt:'2026-11-12'}],pagination:{page:1,pages:1,total:1}};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/owner')){
    requests.push(req.url);res.setHeader('Content-Type','application/json');
    if(url.pathname.endsWith('/login'))signedIn=true;
    if(url.pathname.endsWith('/logout'))signedIn=false;
    if(!signedIn){res.writeHead(401).end(JSON.stringify({message:'Owner login required'}));return;}
    if(url.pathname.endsWith('/reports')){const data=structuredClone(report);if(url.searchParams.get('search')==='missing'){data.companies=[];data.pagination.total=0;data.pagination.pages=0;}res.end(JSON.stringify(data));return;}
    res.end(JSON.stringify({email:'qa-owner@example.test'}));return;
  }
  try{const file=path.join(root,url.pathname.replace(/^\/owner\/?/,'')||'index.html');if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(4281,'127.0.0.1',r));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9338','--user-data-dir='+path.resolve('.browser-owner-qa'),'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
  let tabs;for(let i=0;i<100;i++){try{tabs=await(await fetch('http://127.0.0.1:9338/json')).json();if(tabs.length)break;}catch{}await sleep(100);}
  ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
  let seq=0;const pending=new Map(),errors=[];
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||'Evaluation failed');return r.result.value;};
  const until=async expression=>{for(let i=0;i<100;i++){if(await ev(expression))return;await sleep(100);}throw Error('Timeout '+expression);};
  await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1512,height:1100,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:'http://127.0.0.1:4281/owner/'});await until('!!document.querySelector("#login-form")');
  assert.equal(await ev('document.querySelector("#dashboard").hidden'),true);
  await ev('document.querySelector("#email").value="qa-owner@example.test";document.querySelector("#password").value="fake-password";document.querySelector("#login-form").requestSubmit();');
  await until('!document.querySelector("#dashboard").hidden && document.querySelectorAll(".card").length===8');
  assert.ok(await ev('document.querySelector("#companies").textContent.includes("Chandhu Logistics")'));
  assert.ok(await ev('document.querySelector("#payment-mode").textContent.includes("test")'));
  assert.ok(await ev('document.querySelector("#revenue").textContent.includes("6,500")'));
  await fs.mkdir('docs',{recursive:true});
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile('docs/ciyash-owner-dashboard-preview.png',Buffer.from(shot.data,'base64'));
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);
  assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+1'),'Mobile page overflow');
  await ev('document.querySelector("#search").value="missing";document.querySelector("#filters").requestSubmit();');
  await until('document.querySelector("#companies").textContent.includes("No companies match")');
  assert.ok(requests.some(r=>r.includes('search=missing')));
  await ev('document.querySelector("#logout").click()');await until('document.querySelector("#dashboard").hidden');
  assert.deepEqual(errors,[]);console.log('PASS: owner login/session, real UI with mocked report data, quota/revenue tables, search, mobile layout and logout. Preview uses mock data.');await call('Browser.close');
}finally{ws?.close();chrome.kill();await new Promise(r=>server.close(r));}
