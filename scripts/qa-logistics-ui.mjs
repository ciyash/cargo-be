// UI integration smoke test against the real Angular build and explicit mocked APIs.
// No backend DB, payment, carrier credentials or real orders are used.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const WebSocket=globalThis.WebSocket||createRequire(new URL('../../crm-frontend/package.json',import.meta.url))('ws');
const root=path.resolve(process.argv[2]||'.frontend-build-check');
const profile=path.resolve('.browser-logistics');await fs.mkdir(profile,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))file=path.join(root,'index.html');let data;try{data=await fs.readFile(file);}catch{file=path.join(root,'index.html');data=await fs.readFile(file);}const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(500).end();}});
await new Promise(r=>server.listen(4280,'127.0.0.1',r));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-extensions','--disable-gpu','--no-first-run','--remote-debugging-port=9337','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
  let tabs;for(let i=0;i<100;i++){try{tabs=await(await fetch('http://127.0.0.1:9337/json')).json();if(tabs.some(t=>t.type==='page'))break;}catch{}await sleep(100);}
  assert.ok(tabs?.length,'Chrome debug endpoint did not start');
  ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let seq=0;const pending=new Map(),errors=[],requests=[],bookings=[],team=[];
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const branches=[{_id:'507f1f77bcf86cd799439021',branchUniqueId:'HYD001',name:'Hyderabad HQ',city:'Hyderabad',location:'Ameerpet',address:'Origin road',pincode:'500016',country:'India',ownershipType:'own'},{_id:'507f1f77bcf86cd799439022',branchUniqueId:'VJA001',name:'Vijayawada Franchise',city:'Vijayawada',address:'Destination road',pincode:'520010',country:'India',ownershipType:'franchise',franchiseQuota:{allocated:100,used:0,held:0}}];
  const context={company:{_id:'507f1f77bcf86cd799439011',name:'QA Logistics',operatingCategories:'both'},user:{role:'company',name:'QA owner'},canManage:true,canPay:true,branches,quota:{total:10000,used:0,held:0,available:10000,canBook:true,pack:{bookings:10000,amount:500000}},services:[{key:'delhivery',name:'Delhivery',categories:['domestic'],implemented:true,wallet:false,tracking:true,fee:10000,note:'Mock Delhivery adapter fixture',connection:{enabled:true,connected:true,environment:'staging'}}]};
  if(process.argv.includes('--offer'))Object.assign(context.quota,{total:100,available:100,freeGranted:100,pack:{bookings:1000,amount:100,currency:'INR',testOffer:true}});
  const cities=[{_id:'507f1f77bcf86cd799439061',cityName:'Hyderabad',state:'Telangana',country:'India'},{_id:'507f1f77bcf86cd799439062',cityName:'Vijayawada',state:'Andhra Pradesh',country:'India'}];context.cities=cities;
  let packageOptions=[{name:'Box'},{name:'Bag'}],dispatchOptions=[{name:'Surface'}];
  let profileDelay=0,branchDelay=0,cityDelay=0,assignedProfile=true;
  if(process.argv.includes('--pickup-default'))branches.push({_id:'507f1f77bcf86cd799439023',branchUniqueId:'HYD002',name:'Hyderabad East',city:'Hyderabad',country:'India'});
  if(process.argv.includes('--cities')){cities.length=0;branches.length=0;}
  const companyToken=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({role:'company',companyId:context.company._id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.qa-only';
  if(process.argv.includes('--company'))branches.push({_id:'507f1f77bcf86cd799439023',branchUniqueId:'HYD002',name:'Hyderabad East',city:'Hyderabad',pincode:'500001',country:'India',ownershipType:'own'});
  const creditRows=[1001,1002].map((grnNo,i)=>({grnNo,lrNumber:'QA/'+grnNo,agent:'Credit Party',senderName:'Sender',pickUpBranchname:'Hyderabad HQ',dropBranchname:'Vijayawada Franchise',bookingStatus:0,bookingDate:new Date().toISOString(),grandTotal:100+i*100}));
  const deliveryRow={...creditRows[0],bookingType:'toPay',bookingStatus:2,grandTotal:200,receiverName:'Receiver',receiverMobile:8888888888};
  const cancelRow={...creditRows[1],bookingType:'paid',bookingStatus:0,grandTotal:200,packages:[],senderName:'Sender',receiverName:'Receiver',senderMobile:9999999999,receiverMobile:8888888888};
  async function intercept(event){
    const request=event.request,u=new URL(request.url);requests.push({url:u.pathname,method:request.method,body:request.postData,headers:request.headers});let body={},responseCode=200;
    if(request.method==='OPTIONS')body={};
    else if(['/booking/sales-summary-branchwise','/booking/status-wise-summary','/booking/acparty-account','/booking/branch-account'].includes(u.pathname))body={data:[],branchwiseStatus:[],parties:[],branchwise:[]};
    else if(['/vehicle','/Vehicle'].includes(u.pathname))body=[];
    else if(u.pathname==='/voucher-generate/credit-voucher-generate')body={data:creditRows};
    else if(u.pathname==='/voucher-generate'&&request.method==='POST')body={success:true};
    else if(u.pathname==='/booking/grnNo/1001')body={booking:deliveryRow};
    else if(u.pathname==='/booking/grnNo/1002'&&request.method==='GET')body={booking:cancelRow};
    else if(u.pathname==='/booking/delivery-booking'){deliveryRow.bookingStatus=4;body={success:true,message:'Delivered'};}
    else if(u.pathname==='/booking/cancelBooking/1002'){cancelRow.bookingStatus=5;cancelRow.refundAmount=200;body={success:true,message:'Cancelled',booking:cancelRow};}
    else if(u.pathname==='/subadmin-auth/profile')body={name:'Booking staff',role:context.user.role,roleVersion:2,branchId:assignedProfile?branches[0]:null,companyId:context.company};
    else if(u.pathname==='/billing/staff-status'||u.pathname==='/billing/status')body={...context.quota,checkoutConfigured:false,testMode:!process.argv.includes('--offer'),pack:{...context.quota.pack,currency:'INR'}};
    else if(u.pathname==='/company/login')body={token:companyToken,role:'admin',accountType:'company',permissions:['bookings','loading','delivery','accounts','reports','team','subscription','branches','settings','services'],company:context.company};
    else if(u.pathname==='/company/branding')body={companyId:context.company._id,name:context.company.name,logoText:'QL'};
    else if(u.pathname==='/company/branches'&&request.method==='GET')body=branches;
    else if(u.pathname==='/subadmin-auth/subadmins'||u.pathname==='/subadmin-auth/employees')body=team;
    else if(u.pathname.startsWith('/subadmin-auth/update-profile/')&&request.method==='PATCH'){
      const account=team.find(row=>row._id===u.pathname.split('/').at(-1)),input=JSON.parse(request.postData);Object.assign(account,input,{branchId:branches.find(branch=>branch._id===input.branchId)||null});body={message:'Account updated',subadmin:account};
    }
    else if(u.pathname.startsWith('/subadmin-auth/account-status/')&&request.method==='PATCH'){
      const account=team.find(row=>row._id===u.pathname.split('/').at(-1));account.isBlocked=JSON.parse(request.postData).isBlocked;body={message:account.isBlocked?'Account blocked':'Account unblocked',account};
    }
    else if(u.pathname==='/subadmin-auth/signup-by-company'){const input=JSON.parse(request.postData);const account={...input,_id:'507f1f77bcf86cd799439042',roleLabel:'Company Admin'};team.push(account);body={subadmin:account};}
    else if(u.pathname==='/multi-router/cities'&&request.method==='POST'){const input=JSON.parse(request.postData);if(cities.some(c=>c.cityName.toLowerCase()===input.cityName.trim().toLowerCase())){responseCode=409;body={message:'This city already exists for your company'};}else{const city={...input,_id:'507f1f77bcf86cd79943906'+cities.length};cities.push(city);body={message:'City added successfully',city};}}
    else if(u.pathname.startsWith('/multi-router/cities/')&&request.method==='PATCH'){const city=cities.find(c=>c._id===u.pathname.split('/').at(-1)),input=JSON.parse(request.postData),oldName=city.cityName;Object.assign(city,input);let count=0;for(const branch of branches){if(branch.cityId===city._id||(!branch.cityId&&branch.city===oldName)){Object.assign(branch,{cityId:city._id,city:city.cityName,state:city.state,country:city.country});count++;}}body={success:true,data:city,branchesUpdated:count};}
    else if(u.pathname==='/multi-router/cities')body=cities;
    else if(u.pathname==='/company/branches'&&request.method==='POST'){const input=JSON.parse(request.postData);const branch={...input,_id:'507f1f77bcf86cd79943902'+branches.length,branchUniqueId:'QA'+branches.length};branches.push(branch);body={success:true,data:branch};}
    else if(u.pathname==='/branch')body=branches;
    else if(u.pathname.startsWith('/branch/city/'))body=branches.filter(b=>b.city===decodeURIComponent(u.pathname.split('/').at(-1)));
    else if(u.pathname==='/multi-router/package-types'){body=packageOptions;if(!packageOptions.length){responseCode=404;body={message:'No package types found'};}}
    else if(u.pathname==='/multi-router/dispatch-types'){body=dispatchOptions;if(!dispatchOptions.length){responseCode=404;body={message:'No dispatch types found'};}}
    else if(u.pathname==='/booking/users/search')body={success:true,source:'User',count:0,results:[]};
    else if(u.pathname==='/booking/search-data')body=[{...deliveryRow,...(JSON.parse(request.postData).grnNo==='1002'?{grnNo:1002,bookingStatus:0,senderMobile:'9999999999',receiverMobile:'8888888888'}:{}),lrNumber:'QA/1000',fromCity:'Hyderabad',toCity:'Vijayawada',packages:[{packageType:'Box',quantity:1,contains:'Clothes',weight:2}],loadingBranchname:'Hyderabad HQ',loadingByemp:'Admin',unloadingBranchname:'Vijayawada Franchise',bookingDate:new Date().toISOString()}];
    else if(u.pathname==='/booking/grnNo/1002'&&request.method==='PATCH')body={booking:JSON.parse(request.postData),message:'Updated'};
    else if(u.pathname==='/cfmaster')body={data:[]};
    else if(u.pathname==='/extra-charge/filter-city-wise')body=[];
    else if(u.pathname==='/auth/login')body={token:'qa-session-token',role:context.user.role,roleLabel:context.user.roleLabel,permissions:context.user.permissions,accountType:'staff'};
    else if(u.pathname==='/workspace/context')body=context;
    else if(u.pathname==='/workspace/services/delhivery/connect'){const input=JSON.parse(request.postData);Object.assign(context.services[0].connection,{connected:true,accountLabel:input.clientName,environment:input.environment});body={connected:true};}
    else if(u.pathname.startsWith('/workspace/branches/')&&u.pathname.endsWith('/courier')){const id=u.pathname.split('/')[3],branch=branches.find(b=>b._id===id);Object.assign(branch,JSON.parse(request.postData));body=branch;}
    else if(u.pathname==='/workspace/staff'&&request.method==='POST'){body={...JSON.parse(request.postData),_id:'507f1f77bcf86cd799439041'};team.push({...body,branchId:branches.find(b=>b._id===body.branchId)});}
    else if(u.pathname.startsWith('/workspace/staff/')&&request.method==='PATCH'){body=JSON.parse(request.postData);Object.assign(team.find(u=>u._id===body._id)||{},body);}
    else if(u.pathname==='/workspace/staff')body=team.map(u=>({...u,branchId:typeof u.branchId==='string'?branches.find(b=>b._id===u.branchId):u.branchId}));
    else if(u.pathname==='/workspace/bookings'&&request.method==='GET')body={rows:bookings,totals:{total:bookings.length,freight:bookings.reduce((n,b)=>n+b.grandTotal,0)},pagination:{page:1,pages:bookings.length?1:0,total:bookings.length,limit:25}};
    else if(u.pathname==='/workspace/options'){const input=JSON.parse(request.postData),own=input.toCity==='Vijayawada';body={route:{own,origin:branches[0],destination:own?branches[1]:null,reason:own?'Both ends are served by the company network.':'No complete own-network route; choose an enabled courier.'},quotes:[own?{providerKey:'own',name:context.company.name,amount:50,currency:'INR'}:{providerKey:'delhivery',courierId:'S',name:'Delhivery Surface',amount:80,currency:'INR',estimated:true}]};}
    else if(u.pathname==='/workspace/bookings'&&request.method==='POST'){const data=JSON.parse(request.postData);body={...data,_id:'507f1f77bcf86cd79943903'+bookings.length,grnNo:1001+bookings.length,lrNumber:'QA/'+(1001+bookings.length),fulfilment:data.providerKey==='own'?'own':'external',provider:data.providerKey==='own'?undefined:{key:'delhivery',courierName:'Delhivery Surface',awb:'123456789012',environment:'staging'},trackingEvents:[],confirmationStatus:'confirmed',quotaStatus:'consumed',bookingStatus:0,shipmentStage:'Booked',grandTotal:data.expectedAmount,bookingDate:new Date().toISOString(),pickUpBranchname:'Hyderabad HQ'};bookings.push(body);context.quota.used++;context.quota.available--;}
    else if(/^\/workspace\/bookings\/[^/]+$/.test(u.pathname)&&request.method==='GET')body=bookings.find(b=>b._id===u.pathname.split('/').at(-1));
    else if(u.pathname==='/workspace/staff'||u.pathname==='/workspace/quota-ledger'||u.pathname==='/billing/history')body=[];
    else if(process.argv.includes('--report-design')&&request.method==='GET')body=[];
    else throw Error('Unexpected mocked request '+request.method+' '+u.pathname);
    const delay=u.pathname==='/subadmin-auth/profile'?profileDelay:u.pathname==='/branch'?branchDelay:u.pathname==='/multi-router/cities'?cityDelay:0;if(delay)await sleep(delay);
    await call('Fetch.fulfillRequest',{requestId:event.requestId,responseCode,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'http://127.0.0.1:4280'},{name:'Access-Control-Allow-Headers',value:'Authorization,Content-Type,Idempotency-Key'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,OPTIONS'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
  }
  ws.onmessage=e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result);}else if(r.method==='Fetch.requestPaused')intercept(r.params).catch(error=>{errors.push(error.message);call('Fetch.failRequest',{requestId:r.params.requestId,errorReason:'Aborted'});});else if(r.method==='Runtime.exceptionThrown')errors.push(r.params.exceptionDetails.exception?.description||r.params.exceptionDetails.text);};
  async function ev(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||'Browser evaluation failed');return r.result.value;}
  async function until(expression){for(let i=0;i<100;i++){if(await ev(expression))return;await sleep(100);}throw Error('UI timeout: '+expression+' body='+await ev('document.body.innerText.slice(0,1500)')+' errors='+JSON.stringify(errors)+' requests='+JSON.stringify(requests.map(r=>r.method+' '+r.url)));}
  async function text(value){await until('!!document.body?.innerText.includes('+JSON.stringify(value)+')');}
  async function go(route){await call('Page.navigate',{url:'http://127.0.0.1:4280'+route});await text('QA Logistics');await until('!document.body.innerText.includes("Loading your company workspace")');}
  async function click(label){await ev('(()=>{const b=Array.from(document.querySelectorAll("button")).find(b=>(b.getAttribute("aria-label")||b.textContent.trim()).startsWith('+JSON.stringify(label)+'));if(!b||b.disabled)throw Error("Button missing/disabled: "+'+JSON.stringify(label)+');b.click();})()');await sleep(200);}
  async function fill(name,value){await ev('(()=>{const e=document.querySelector("[formControlName='+name+']");if(!e)throw Error("Missing '+name+'");e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event(e.tagName==="SELECT"?"change":"input",{bubbles:true}));})()');}
  await call('Page.enable');await call('Runtime.enable');await call('Fetch.enable',{patterns:[{urlPattern:'http://localhost:4000/*'}]});
  await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token","qa-only-fake-token");localStorage.setItem("auth-user",JSON.stringify({role:"company"}));'});
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  if(process.argv.includes('--franchise-limit')){
    context.user={role:'company_admin',roleVersion:2,name:'QA Company Admin'};
    context.quota.available=500;context.quota.total=500;
    branches[1].ownershipType='franchise';branches[1].franchiseQuota={allocated:0,used:0,held:0};
    await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token",'+JSON.stringify(companyToken)+');localStorage.setItem("auth-user",'+JSON.stringify(JSON.stringify({...context.user,accountType:'company',company:context.company}))+');'});
    await go('/franchise-allowance?branch='+branches[1]._id);await text('Franchise payment & booking limit');
    await until('!!document.querySelector("input[name=allowance]")');
    assert.equal(await ev('document.querySelector("select[name=franchise]").value'),branches[1]._id);
    assert.ok(await ev('!!document.querySelector("input[name=referenceAmount]")'));
    await ev('(()=>{const e=document.querySelector("input[name=allowance]");e.value="1000";e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    await text('Your company has 500 available bookings.');
    assert.equal(await ev('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Add allowance")).disabled'),true);
    assert.equal(await ev('Array.from(document.querySelectorAll("a")).find(a=>a.textContent==="Purchase more bookings")?.textContent'),'Purchase more bookings');
    await ev('(()=>{const e=document.querySelector("input[name=allowance]");e.value="500";e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    await until('!Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Add allowance")).disabled');
    assert.deepEqual(errors,[]);console.log('PASS: franchise branch preselected, payment amount field visible, 1000 against 500 blocked with purchase link, 500 allowed. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--company-team')){
    const id='507f1f77bcf86cd799439042';
    team.push({_id:id,name:'Branch manager',email:'manager@example.test',phone:'9999999999',username:'manager',role:'admin',roleVersion:2,permissions:['bookings','loading','delivery','accounts','reports','team'],branchId:branches[0],isBlocked:false});
    await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token",'+JSON.stringify(companyToken)+');localStorage.setItem("auth-user",'+JSON.stringify(JSON.stringify({role:'company_admin',roleVersion:2,accountType:'company',company:context.company}))+');'});
    await go('/create-admin#company-team');await text('Branch manager');await click('Edit Branch manager');await text('Edit team account');
    assert.equal(await ev('document.querySelector("#staff-city").value'),'Hyderabad');assert.equal(await ev('document.querySelector("#staff-branch").value'),branches[0]._id);
    assert.equal(await ev('document.querySelector("#staff-password").value'),'');
    await ev('(()=>{const input=document.querySelector("#staff-name");input.value="Updated manager";input.dispatchEvent(new Event("input",{bubbles:true}));})()');await click('Save changes');await text('Team account updated.');await text('Updated manager');
    const update=requests.find(row=>row.method==='PATCH'&&row.url==='/subadmin-auth/update-profile/'+id);assert.ok(update);assert.equal(JSON.parse(update.body).password,undefined);
    await click('Block');await until('document.querySelector(".account-state").textContent.trim()==="Blocked"');await click('Unblock');await until('document.querySelector(".account-state").textContent.trim()==="Active"');
    assert.deepEqual(requests.filter(row=>row.method==='PATCH'&&row.url==='/subadmin-auth/account-status/'+id).map(row=>JSON.parse(row.body).isBlocked),[true,false]);
    assert.deepEqual(errors,[]);console.log('PASS: company login edits team accounts with preserved optional password and assigned city/branch, and blocks/unblocks accounts with visible status. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--role-v2')){
    for(const [role,bookingPath] of [['company_admin','/booking'],['admin','/sub-booking'],['staff','/employee-booking']]){
      context.user={role,roleVersion:2,permissions:['bookings','loading','delivery','accounts','reports',...(role!=='staff'?['team']:[])],name:'QA '+role};context.canManage=role==='company_admin';
      await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-user",'+JSON.stringify(JSON.stringify(context.user))+');'});
      await go('/booking');await until('document.querySelectorAll("[formControlName]").length>=20');assert.equal(await ev('location.pathname'),bookingPath);
      assert.equal(await ev('document.querySelectorAll("app-header").length'),1);
      await go('/dashboard');
      if(role==='staff'){
        await until('location.pathname==="/employee-booking"');
        assert.equal(await ev('Array.from(document.querySelectorAll("app-header a")).some(a=>a.getAttribute("href")==="/dashboard")'),false);
        await go('/employee-dashboard');await until('location.pathname==="/employee-booking"');
      }else{
        await until('!!document.querySelector("app-dashboard")');
        assert.equal(await ev('location.pathname'),'/dashboard');
        assert.equal(await ev('Array.from(document.querySelectorAll("app-header a")).some(a=>a.getAttribute("href")==="/dashboard")'),true);
      }
      if(role!=='company_admin'){await call('Page.navigate',{url:'http://127.0.0.1:4280/createcity'});await until('location.pathname==="/profile"');}
      else {await go('/createemployee');await until('!!document.querySelector("select[formControlName=role]")');assert.deepEqual(await ev('Array.from(document.querySelector("select[formControlName=role]").options).map(o=>o.value)'),['company_admin','admin','staff']);}
    }
    assert.deepEqual(errors,[]);console.log('PASS: canonical Company Admin, Branch Admin and Staff booking routing, team role options and settings denial. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--report-design')){
    for(const [role,routes] of [['admin',['/reportsdashboard','/collectionreport','/pending-delivery']],['subadmin',['/sub-dashboard','/sub-collection','/sub-pendingdelivery']],['employee',['/dashboard-report','/collection-report','/pending-deliverystock']]]){
      context.user={role,permissions:['bookings','loading','delivery','accounts','reports'],name:'QA '+role};
      await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-user",'+JSON.stringify(JSON.stringify(context.user))+');'});
      for(const route of routes){
        await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
        await go(route);await until('!!document.querySelector(".reports-page .reports-shell form")');await sleep(150);
        assert.equal(await ev('location.pathname'),route);
        assert.ok(await ev('document.querySelector(".reports-shell").getBoundingClientRect().top<120'),'Report starts below navigation without a large gap');
        assert.ok(await ev('getComputedStyle(document.querySelector(".reports-shell form")).borderRadius!=="0px"'));
        assert.ok(await ev('parseFloat(getComputedStyle(document.querySelector(".reports-shell .form-control,.reports-shell .form-select")).height)<45'));
        if(route==='/reportsdashboard')await fs.writeFile('docs/reports-filters-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
        await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);
        assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+2'),'Report must fit mobile: '+route);
        if(route==='/reportsdashboard')await fs.writeFile('docs/reports-filters-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
      }
    }
    const reportFixture={fromDate:'2026-11-12',toDate:'2026-11-13',data:{paid:{bookings:[{grnNo:1000,lrNumber:'QA/1000',bookingStatus:0,senderName:'Sample sender',receiverName:'Sample receiver',pickUpBranchname:'Hyderabad HQ',dropBranchname:'Vijayawada Franchise',totalQuantity:2,grandTotal:240,packages:[]}],allGrandTotal:240},toPay:{bookings:[]},credit:{bookings:[]},FOC:{bookings:[]},CLR:{bookings:[]}}};
    await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-user",JSON.stringify({role:"admin"}));localStorage.setItem("parcelReportData",'+JSON.stringify(JSON.stringify(reportFixture))+');'});
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await go('/reports');await text('Sample sender');
    await fs.writeFile('docs/reports-table-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+2'));
    await call('Emulation.setEmulatedMedia',{media:'print'});assert.equal(await ev('getComputedStyle(document.querySelector(".report-table-scroll")).overflow'),'visible');await call('Emulation.setEmulatedMedia',{media:'screen'});
    assert.deepEqual(errors,[]);console.log('PASS: nine report filters across all three roles plus populated report table, desktop/mobile layouts and print overflow. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--shipment-design')){
    await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-user",JSON.stringify({role:"admin"}));'});
    await go('/booking');
    await ev('(()=>{const input=document.querySelector("input[name=searchTerm]");input.value="1000";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
    await click('Find shipment');await text('QA/1000');await sleep(600);
    assert.ok(await ev('document.querySelector(".shipment-overview").innerText.includes("Unloaded")'));
    assert.equal(await ev('document.querySelector(".detail-tabs [aria-selected=true]").textContent.trim()'),'Booking');
    await click('Loading');assert.ok(await ev('Array.from(document.querySelectorAll(".section-title")).find(e=>e.textContent.includes("Loading Details")).parentElement.hidden===false'));
    await click('Unloading');await click('Receiver');await click('Booking');
    assert.equal(await ev('Array.from(document.querySelectorAll("#extraLargeModal button")).some(b=>b.textContent.trim()==="Edit booking")'),false);
    assert.equal(await ev('Array.from(document.querySelectorAll("#extraLargeModal button")).some(b=>b.textContent.includes("Save Changes"))'),false);
    await fs.writeFile('docs/shipment-details-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);
    assert.ok(await ev('document.querySelector(".modal-body").scrollWidth<=document.querySelector(".modal-body").clientWidth+1'));
    await fs.writeFile('docs/shipment-details-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await click('Close');await sleep(400);
    await ev('(()=>{const input=document.querySelector("input[name=searchTerm]");input.value="1002";input.dispatchEvent(new Event("input",{bubbles:true}));})()');await click('Find shipment');await sleep(400);await click('Edit booking');
    await until('document.querySelectorAll(".edit-grid input").length===9');
    await ev('(()=>{const input=document.querySelectorAll(".edit-grid input")[4];input.value="Edited receiver";input.dispatchEvent(new Event("input",{bubbles:true}));})()');await click('Save booking');await until('Array.from(document.querySelectorAll("#extraLargeModal input")).some(input=>input.value==="Edited receiver")');
    const editRequest=requests.find(r=>r.url==='/booking/grnNo/1002'&&r.method==='PATCH');assert.ok(editRequest);assert.equal(JSON.parse(editRequest.body).receiverName,'Edited receiver');
    assert.deepEqual(errors,[]);console.log('PASS: shipment modal details, status, delivery action and mobile layout. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--unloading-destination')){
    for(const [role,route] of [['admin','/parcelunloading'],['subadmin','/sub-unloading'],['employee','/employee-unloading']]){
      context.user={role,permissions:['bookings','loading','delivery','accounts','reports'],name:'QA staff'};
      await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-user",'+JSON.stringify(JSON.stringify(context.user))+');'});
      await go(route);
      await until('document.querySelector("[formControlName=toCity]")?.value==="Hyderabad"');
      await until('document.querySelector("[formControlName=branch]")?.value==="HYD001"');
      assert.equal(await ev('document.querySelector("[formControlName=toCity]").options.length'),role==='admin'?3:2);
      if(role==='admin'){
        await fill('toCity','Vijayawada');
        await until('document.querySelector("[formControlName=branch]").options.length===2');
        assert.equal(await ev('document.querySelector("[formControlName=branch]").value'),'');
        assert.equal(await ev('document.querySelector("[formControlName=branch]").options[1].value'),'VJA001');
      }
    }
    assert.deepEqual(errors,[]);console.log('PASS: unloading destination city and branch defaults, city changes and assigned-branch restrictions for all three roles. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--loading-origin')){
    for(const [role,route] of [['admin','/parcelloading'],['subadmin','/sub-loading'],['employee','/employee-loading']]){
      context.user={role,permissions:['bookings','loading','delivery','accounts','reports'],name:'QA staff'};
      await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-user",'+JSON.stringify(JSON.stringify(context.user))+');'});
      await go(route);
      await until('document.querySelector("[formControlName=fromCity]")?.value==="Hyderabad"');
      await until('document.querySelector("[formControlName=pickUpBranch]")?.value==="HYD001"');
      assert.equal(await ev('document.querySelector("[formControlName=fromCity]").options.length'),role==='admin'?3:2);
      if(role==='admin'){
        await fill('fromCity','Vijayawada');
        await until('document.querySelector("[formControlName=pickUpBranch]").options.length===2');
        assert.equal(await ev('document.querySelector("[formControlName=pickUpBranch]").value'),'');
        assert.equal(await ev('document.querySelector("[formControlName=pickUpBranch]").options[1].value'),'VJA001');
      }
    }
    assert.deepEqual(errors,[]);console.log('PASS: offline loading origin defaults and branch filtering for Admin, Branch Admin and Staff. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--pickup-default')){
    await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token","qa-session-token");localStorage.setItem("auth-user",JSON.stringify({role:"admin"}));'});
    for(const profileFirst of [true,false]){
      profileDelay=profileFirst?0:350;cityDelay=profileFirst?300:0;branchDelay=profileFirst?350:0;await go('/booking');await until('document.querySelector("[formControlName=fromCity]").value==="Hyderabad"');await until('document.querySelector("[formControlName=pickUpBranch]").value==="HYD001"');
      assert.deepEqual(await ev('Array.from(document.querySelector("[formControlName=pickUpBranch]").options).slice(1).map(o=>o.text.trim())'),['Hyderabad HQ','Hyderabad East']);assert.equal(await ev('document.querySelector("[formControlName=fromCity]").disabled'),false);assert.equal(await ev('document.querySelector("[formControlName=pickUpBranch]").disabled'),false);
      await fill('fromCity','Vijayawada');await until('document.querySelector("[formControlName=pickUpBranch]").options.length===2');assert.equal(await ev('document.querySelector("[formControlName=pickUpBranch]").value'),'');await fill('pickUpBranch','VJA001');await fill('fromCity','Hyderabad');await until('document.querySelector("[formControlName=pickUpBranch]").options.length===3');assert.equal(await ev('document.querySelector("[formControlName=pickUpBranch]").value'),'');
      await ev('void window.$(document.querySelector("[formControlName=fromCity]")).val("Vijayawada").trigger({type:"select2:select",params:{data:{id:"Vijayawada"}}})');await until('document.querySelector("[formControlName=pickUpBranch]").options.length===2');
    }
    profileDelay=1400;cityDelay=0;branchDelay=0;await call('Page.navigate',{url:'http://127.0.0.1:4280/booking'});await until('document.querySelector("[formControlName=fromCity]")?.options.length===3');await fill('fromCity','Vijayawada');await text('QA Logistics');await sleep(100);assert.equal(await ev('document.querySelector("[formControlName=fromCity]").value'),'Vijayawada','Late profile must preserve a manual city');
    profileDelay=0;assignedProfile=false;await go('/booking');await sleep(250);assert.equal(await ev('document.querySelector("[formControlName=fromCity]").value'),'Hyderabad','Company-wide Admin defaults to the company branch');assert.equal(await ev('document.querySelector("[formControlName=pickUpBranch]").value'),'HYD001');await fill('fromCity','Hyderabad');await until('document.querySelector("[formControlName=pickUpBranch]").options.length===3');
    assert.deepEqual(errors,[]);console.log('PASS: assigned city and pickup branch default for Company Admin, both request orders, editable city/branch, city-filtered choices, stale branch clearing, Select2 interaction and manual/unassigned fallbacks. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--lookup-refresh')){
    for(const role of ['admin','subadmin','employee']){
      packageOptions=[];dispatchOptions=[];context.user={role,permissions:['bookings','loading','delivery','accounts','reports'],name:'QA '+role,branchId:'HYD001',branchObjectId:branches[0]._id};context.canManage=role==='admin';
      await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token","qa-session-token");localStorage.setItem("auth-user",'+JSON.stringify(JSON.stringify({role,permissions:['bookings','loading','delivery','accounts','reports']}))+');'});
      await go('/booking');await text('Shipment route & booking details');await text('Package types could not load');await text('Dispatch types could not load');await fill('senderName','Keep sender details');await fill('quantity','2');
      packageOptions=['Box','Bag','Envelope','Bundle','Pallet'].map(name=>({name}));dispatchOptions=['Road Transport','Air Cargo','Rail Cargo','Express Delivery'].map(name=>({name}));await click('Refresh lists');await until('document.querySelector("[formControlName=packageType]").options.length===6');await until('document.querySelector("[formControlName=dispatchType]").options.length===5');
      assert.deepEqual(await ev('Array.from(document.querySelector("[formControlName=dispatchType]").options).slice(1).map(o=>o.text)'),dispatchOptions.map(o=>o.name));await fill('dispatchType','Road Transport');await fill('packageType','Box');packageOptions.push({name:'Crate'});await ev('window.dispatchEvent(new Event("focus"))');await until('document.querySelector("[formControlName=packageType]").options.length===7');
      assert.equal(await ev('document.querySelector("[formControlName=senderName]").value'),'Keep sender details');assert.equal(await ev('document.querySelector("[formControlName=quantity]").value'),'2');assert.equal(await ev('document.querySelector("[formControlName=packageType]").value'),'Box');assert.equal(await ev('document.querySelector("[formControlName=dispatchType]").value'),'Road Transport');
    }
    assert.deepEqual(errors,[]);console.log('PASS: all three existing booking forms recover empty dispatch/package lists on manual refresh, refresh on tab focus, and preserve entered details and selections. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--crm-only')){
    context.user={role:'admin',permissions:['bookings','loading','delivery','reports','team','settings','subscription','branches'],name:'QA Admin'};context.canManage=true;context.canPay=true;
    await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token","qa-session-token");localStorage.setItem("auth-user",JSON.stringify({role:"admin"}));'});
    for(const [oldPath,path] of [['dashboard','/dashboard'],['company','/adminprofile'],['branches','/createbranch'],['team','/createemployee'],['services','/courier-services'],['subscription','/subscription'],['allowance','/franchise-allowance'],['bookings','/gnrnumberstatus'],['operations','/parcelloading'],['reports','/reportsdashboard']]){
      await call('Page.navigate',{url:'http://127.0.0.1:4280/workspace/'+oldPath});await until('location.pathname==='+JSON.stringify(path));await until('!!document.querySelector("app-header")');await sleep(150);
      assert.equal(await ev('document.querySelectorAll(".logistics-layout > aside").length'),0,'No separate portal navigation: '+path);assert.equal(await ev('Array.from(document.querySelectorAll("app-header a")).some(a=>(a.getAttribute("href")||"").startsWith("/workspace"))'),false,'Header must use existing CRM/settings links');
      if(path==='/franchise-allowance'){await text('Allocate franchise bookings');assert.equal(await ev('document.querySelector("[name=branchName]")'),null,'No duplicate branch creation');}
    }
    await call('Page.navigate',{url:'http://127.0.0.1:4280/workspace/unknown'});await until('location.pathname==="/profile"');await until('!!document.querySelector("app-header")');assert.equal(await ev('document.querySelector("app-logistics-workspace")'),null);
    context.user={role:'subadmin',permissions:['bookings','team'],name:'Branch manager',branchId:'HYD001',branchObjectId:branches[0]._id};context.canManage=false;context.canManageTeam=true;context.canPay=false;
    await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token","qa-session-token");localStorage.setItem("auth-user",JSON.stringify({role:"subadmin",permissions:["bookings","team"]}));'});await go('/branch-staff');await until('!!document.querySelector("[name=staffRole]")');assert.deepEqual(await ev('Array.from(document.querySelector("[name=staffRole]").options).map(o=>o.text)'),['Staff']);assert.equal(await ev('document.querySelectorAll(".logistics-layout > aside").length'),0);assert.equal(await ev('document.querySelectorAll("[name=staffBranch] option").length'),2);
    assert.deepEqual(errors,[]);console.log('PASS: every legacy Workspace destination redirects to existing CRM or unique settings; one header, no portal navigation, no duplicate branch form, franchise allocation preserved. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--booking-roles')){
    for(const [role,path] of [['admin','/booking'],['subadmin','/sub-booking'],['employee','/employee-booking']]){
      context.user={role,permissions:['bookings'],name:'QA '+role,branchId:'HYD001',branchObjectId:branches[0]._id};context.canManage=role==='admin';
      await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token","qa-session-token");localStorage.setItem("auth-user",'+JSON.stringify(JSON.stringify({role,permissions:['bookings']}))+');'});
      for(const entry of [path,'/workspace-booking','/booking']){
        await go(entry);await text('Shipment route & booking details');assert.equal(await ev('location.pathname'),path);
        for(const field of ['fromCity','toCity','senderName','senderMobile','receiverName','receiverMobile','quantity','unitPrice','bookingType','grandTotal'])assert.ok(await ev('!!document.querySelector("[formControlName='+field+']")'),role+' missing '+field);
        assert.ok(await ev('document.querySelectorAll("[formControlName]").length>=20'),'Full CRM fields must remain');assert.ok(await ev('!!document.querySelector("app-search-grn-number")'),'GRN lookup must remain');assert.equal(await ev('document.querySelectorAll("app-header").length'),1);assert.equal(await ev('document.querySelectorAll("app-shipping-booking").length'),0);
      }
      await fill('senderMobile','999999999999');assert.equal(await ev('document.querySelector("[formControlName=senderMobile]").value'),'9999999999');
      await click('Bookings');assert.equal(await ev('Array.from(document.querySelectorAll(".navigation-dropdown a")).filter(a=>a.getAttribute("href")==='+JSON.stringify(path)+').length'),1);
    }
    context.user={role:'employee',permissions:['reports'],name:'Report staff',branchId:'HYD001',branchObjectId:branches[0]._id};context.canManage=false;
    await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token","qa-session-token");localStorage.setItem("auth-user",JSON.stringify({role:"employee",permissions:["reports"]}));'});await go('/booking');assert.equal(await ev('location.pathname'),'/employee-booking');await text('Shipment route & booking details');
    await click('Credit Accounts');for(const path of ['/getcfmasterdata','/creditvouchergenerate','/voucherdetailscf'])assert.ok(await ev('Array.from(document.querySelectorAll(".navigation-dropdown a")).some(a=>a.getAttribute("href")==='+JSON.stringify(path)+')'));
    await click('Parcel Report');assert.ok(await ev('document.querySelectorAll(".navigation-dropdown a").length>=10'));
    await click('Bookings');for(const path of ['/employee-booking','/employee-loading','/employee-unloading','/employee-parcel-devlivery'])assert.ok(await ev('Array.from(document.querySelectorAll(".navigation-dropdown a")).some(a=>a.getAttribute("href")==='+JSON.stringify(path)+')'));
    for(const path of ['/createemployee','/createcity','/createvehicle','/adddispatchtype','/addpackagetype','/subscription','/branch-staff']){await call('Page.navigate',{url:'http://127.0.0.1:4280'+path});await until('location.pathname==="/profile"');}
    assert.equal(bookings.length,0);assert.deepEqual(errors,[]);console.log('PASS: all three original full CRM booking forms restored, shared links dispatch by role, full fields/GRN lookup and phone limits preserved, Staff has all daily work and Credit Accounts, but setup/admin routes remain denied. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--phones')){
    await call('Page.navigate',{url:'http://127.0.0.1:4280/clogin'});await text('Company login');await fill('email','company@example.test');await fill('password','password123');await click('Sign in');await text('Set up your company');
    await ev('location.hash="company-team"');await fill('phone','90000abc00001999');assert.equal(await ev('document.querySelector("#staff-phone").value'),'9000000001');assert.equal(await ev('document.querySelector("#staff-phone").maxLength'),10);
    await ev('location.hash="company-branches"');await fill('cityId',cities[0]._id);assert.equal(await ev('document.querySelector("#branch-phone").maxLength'),10);assert.equal(await ev('document.querySelector("#branch-name").type'),'text');assert.equal(await ev('document.querySelector("#branch-address").hasAttribute("maxlength")'),false);
    for(const international of [false,true]){
      await go('/workspace-booking');await text('Route & destination');if(international)await fill('category','international');
      for(const [key,value] of Object.entries({destinationCountry:international?'United Kingdom':'India',toCity:international?'London':'Delhi',destinationPostalCode:international?'SW1A1AA':'110001',receiverState:international?'London':'Delhi'}))await fill(key,value);
      await click('Continue');
      for(const [key,value] of Object.entries({senderName:'Sender',senderAddress:'Origin road',receiverName:'Receiver',receiverAddress:'Destination road',senderMobile:international?'+442071234567':'999999999',receiverMobile:international?'+442071234568':'8888888888'}))await fill(key,value);
      if(!international){await click('Continue');await text('exactly 10 digits');await fill('senderMobile','99999abc999999999');assert.equal(await ev('document.querySelector("[formControlName=senderMobile]").value'),'9999999999');assert.equal(await ev('document.querySelector("[formControlName=senderMobile]").maxLength'),10);}
      else{assert.equal(await ev('document.querySelector("[formControlName=senderMobile]").value'),'+442071234567');assert.equal(await ev('document.querySelector("[formControlName=senderMobile]").maxLength'),16);}
      await click('Continue');await until('!document.querySelector("[formControlName=senderMobile]")');
      if(!international){await fill('contains','Books');await click('Check coverage');await text('Choose the service');const payload=JSON.parse(requests.filter(r=>r.url==='/workspace/options'&&r.method==='POST').at(-1).body);assert.equal(payload.senderMobile,'9999999999');assert.equal(payload.receiverMobile,'8888888888');}
    }
    assert.deepEqual(errors,[]);console.log('PASS: domestic phone limits, validation and API values; dynamic non-phone fields and international numbers preserved. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--cities')){
    await call('Page.navigate',{url:'http://127.0.0.1:4280/clogin'});await text('Company login');await fill('email','company@example.test');await fill('password','password123');await click('Sign in');await text('Set up your company');
    await ev('location.hash="company-branches"');await text('Add a city first');assert.equal(await ev('document.querySelector("#branch-city").options.length'),1);
    await ev('location.hash="company-cities"');await text('No cities yet');
    for(const [cityName,state] of [['Hyderabad','Telangana'],['Vijayawada','Andhra Pradesh']]){await fill('cityName',cityName);await fill('state',state);await click('Add city');await until('!document.querySelector("#company-city-name").value');}
    await fill('cityName','hyderabad');await fill('state','Telangana');await click('Add city');await text('This city already exists for your company');
    await click('Create branch');await until('location.hash==="#company-branches"');assert.equal(await ev('document.querySelector("#branch-city").value'),cities[0]._id);assert.equal(await ev('document.querySelector("#branch-state").value'),'Telangana');assert.equal(await ev('document.querySelector("#branch-country").readOnly'),true);
    for(const [i,name] of ['Hyderabad Main','Hyderabad East'].entries()){
      await fill('cityId',cities[0]._id);for(const [field,value] of Object.entries({name,location:i?'East':'Main',address:'12 Test Road',phone:'9999999999',pincode:'500001'}))await ev('(()=>{const e=document.getElementById('+JSON.stringify('branch-'+field)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("input",{bubbles:true}));})()');await fill('branchType',i?'normal':'main');
      await click('Create branch');await text('Branch created. You can assign it');await until('!document.querySelector("#branch-name").value');
    }
    const created=requests.filter(r=>r.url==='/company/branches'&&r.method==='POST').map(r=>JSON.parse(r.body));assert.equal(created.length,2);assert.ok(created.every(b=>b.cityId===cities[0]._id&&b.city==='Hyderabad'&&b.state==='Telangana'));
    await ev('location.hash="company-cities"');await click('Edit city');await fill('cityName','Hyderabad Metro');await click('Save city');await text('City updated.');await until('!document.querySelector("#company-city-name").value');assert.ok(branches.every(b=>b.city==='Hyderabad Metro'));assert.equal(requests.filter(r=>r.method==='PATCH'&&r.url.startsWith('/multi-router/cities/')).length,1);
    await click('Edit city');await fill('cityName','Discarded city');await click('Cancel edit');assert.equal(await ev('document.querySelector("#company-city-name").value'),'');assert.equal(cities[0].cityName,'Hyderabad Metro');assert.equal(requests.filter(r=>r.method==='PATCH'&&r.url.startsWith('/multi-router/cities/')).length,1);
    await ev('location.hash="company-team"');await fill('role','subadmin');await fill('branchCity','Hyderabad Metro');assert.deepEqual(await ev('Array.from(document.querySelector("#staff-branch").options).slice(1).map(o=>o.text)'),['Hyderabad Main','Hyderabad East']);
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await ev('location.hash="company-cities"');await text('Your company cities');assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+1'));
    await ev('location.hash="company-branches"');await text('Branch management');assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+1'));assert.ok(['flex','inline-flex'].includes(await ev('getComputedStyle(document.querySelector(".branch-manage-footer .branch-action")).display')));await fs.writeFile(path.resolve('docs/company-branches-mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    assert.deepEqual(errors,[]);console.log('PASS: company cities, branch creation and edits, city-filtered assignments, styled branch management and mobile layout. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--offer')){
    await go('/workspace/subscription');await text('100 free welcome bookings');await text('1,000 bookings');await text('LIVE keys charge real money');
    await call('Page.navigate',{url:'http://127.0.0.1:4280/clogin'});await text('Company login');await fill('email','company@example.test');await fill('password','password123');await click('Sign in');await text('Set up your company');
    await ev('location.hash="company-billing"');await text('1,000 bookings');await text('100 free welcome bookings');await text('Razorpay LIVE mode: checkout will charge real money');
    assert.deepEqual(errors,[]);console.log('PASS: 100 free welcome bookings, INR 1 / 1,000 booking offer and explicit live-payment mode on company billing screens. No payments submitted.');await call('Browser.close');
  }else if(process.argv.includes('--logic')){
    await call('Page.navigate',{url:'http://127.0.0.1:4280/creditvouchergenerate'});await text('Generate Credit Statement');
    await click('Load bookings');await text('QA/1002');
    assert.equal(await ev('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Generate selected")).disabled'),true);
    await ev('Array.from(document.querySelectorAll("input")).find(e=>e.getAttribute("aria-label")==="Select all loaded bookings").click()');await text('2 bookings selected');
    await click('Generate selected');await text('Credit statement generated');
    assert.deepEqual(JSON.parse(requests.find(r=>r.url==='/voucher-generate'&&r.method==='POST').body).grnNo,[1001,1002]);
    await call('Page.navigate',{url:'http://127.0.0.1:4280/parcel-delivery?grn=1001'});await text('Freight collected now');
    assert.equal(await ev('document.querySelector("[formControlName=toPayDeliveredAmount]").value'),'200');
    await click('Submit');await until('document.body.innerText.toLowerCase().includes("already delivered")');
    const delivered=JSON.parse(requests.find(r=>r.url==='/booking/delivery-booking'&&r.method==='POST').body);assert.equal(delivered.toPayDeliveredAmount,200);assert.equal(Number(delivered.grnNo),1001);
    await call('Page.navigate',{url:'http://127.0.0.1:4280/cancel-booking'});await text('Search By:');
    await ev('(()=>{const e=document.querySelector("input[name=searchTerm]");e.value="1002";e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    await ev('document.querySelector("form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');
    await text('Full prepaid reversal');assert.equal(await ev('document.querySelector("[formControlName=refundAmount]").value'),'200');assert.equal(await ev('document.querySelector("[formControlName=refundAmount]").readOnly'),true);
    await click('Cancel Booking');await text('Cancellation request processed');
    assert.ok(requests.some(r=>r.url==='/booking/cancelBooking/1002'&&r.method==='POST'));
    assert.deepEqual(errors,[]);console.log('PASS: real Angular Credit Statement selection posts every selected GRN, delivery sends full To Pay freight to correct endpoint, cancellation shows full prepaid reversal. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--company')){
    await call('Page.navigate',{url:'http://127.0.0.1:4280/clogin'});await text('Company login');
    await fill('email','company@example.test');await fill('password','password123');await click('Sign in');await text('Set up your company');
    assert.ok(await ev('location.pathname==="/create-admin"'));assert.equal(await ev('Array.from(document.querySelectorAll("app-header nav a")).filter(a=>a.getAttribute("href")==="/booking").length'),0);
    await until('!document.body.innerText.includes("Loading accounts")');
    await fs.writeFile(path.resolve('docs/company-setup-portal.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await ev('location.hash="company-brand"');await until('!!document.querySelector("#workspace-logo-text")');
    await ev('location.hash="company-billing"');await text('Payment history');await text('10,000 bookings');assert.equal(await ev('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Purchase booking pack")).disabled'),true);
    await ev('location.hash="company-branches"');await until('!!document.querySelector("[formControlName=ownershipType]")');assert.ok(await ev('document.body.innerText.includes("Your branches")'));
    await ev('location.hash="company-team"');await until('!!document.querySelector("#role")');
    assert.deepEqual(await ev('Array.from(document.querySelector("#role").options).map(o=>o.text)'),['Company Admin','Branch Admin','Staff']);assert.equal(await ev('document.querySelector("#role").value'),'admin');
    await fill('name','New Company Admin');await fill('email','admin@example.test');await fill('password','password123');await click('Create account');await text('Account created.');
    const account=JSON.parse(requests.find(r=>r.url==='/subadmin-auth/signup-by-company'&&r.method==='POST').body);assert.equal(account.role,'admin');assert.equal(account.branchId,null);
    await fill('role','subadmin');await until('!!document.querySelector("#staff-city")');
    assert.equal(await ev('document.querySelector("#staff-branch").options.length'),1,'Choose city before choosing a branch');
    await fill('branchCity','Hyderabad');assert.deepEqual(await ev('Array.from(document.querySelector("#staff-branch").options).slice(1).map(o=>o.text)'),['Hyderabad HQ','Hyderabad East']);
    await fill('branchId',branches[2]._id);await fs.writeFile(path.resolve('docs/branch-admin-city-selection.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));await fill('branchCity','Vijayawada');assert.equal(await ev('document.querySelector("#staff-branch").value'),'','Changing city clears old branch');assert.deepEqual(await ev('Array.from(document.querySelector("#staff-branch").options).slice(1).map(o=>o.text)'),['Vijayawada Franchise']);
    await fill('branchId',branches[1]._id);await fill('name','Vijayawada Branch Admin');await fill('email','branch-admin@example.test');await fill('password','password123');await click('Create account');await text('Account created.');
    const branchAdmin=JSON.parse(requests.filter(r=>r.url==='/subadmin-auth/signup-by-company'&&r.method==='POST').at(-1).body);assert.equal(branchAdmin.role,'subadmin');assert.equal(branchAdmin.branchCity,'Vijayawada');assert.equal(branchAdmin.branchId,branches[1]._id);
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+1'),'Company portal mobile overflow');
    await call('Page.navigate',{url:'http://127.0.0.1:4280/login'});await text('Team login');assert.ok(await ev('!!document.querySelector("a.company-entry")'));
    assert.deepEqual(errors,[]);console.log('PASS: separate company login -> setup portal; logo, payments, branches, correct three roles, Company Admin creation, mobile layout, separate Team login. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--roles')){
    const all=['bookings','loading','delivery','accounts','reports','team','settings','subscription','services','branches'];
    async function session(role,permissions){context.user={role,roleLabel:role==='admin'?'Company Admin':role==='subadmin'?'Branch Admin':'Staff',permissions,name:'QA user',branchId:'HYD001',branchObjectId:branches[0]._id};context.canManage=role==='admin';context.canManageTeam=permissions.includes('team');context.canPay=role==='admin';context.roles=(role==='admin'?[{value:'admin',label:'Company Admin'},{value:'subadmin',label:'Branch Admin'},{value:'employee',label:'Staff'}]:[{value:'employee',label:'Staff'}]);await call('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("auth-token","qa-session-token");localStorage.setItem("auth-user",'+JSON.stringify(JSON.stringify({role,permissions}))+');'});}
    async function named(name,value){await ev('(()=>{const e=document.querySelector("[name='+name+']");if(!e)throw Error("Missing '+name+'");e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event(e.tagName==="SELECT"?"change":"input",{bubbles:true}));})()');}
    await session('admin',all);await go('/workspace/team');await text('Team & permissions');
    assert.deepEqual(await ev('Array.from(document.querySelector("[name=staffRole]").options).map(o=>o.text)'),['Company Admin','Branch Admin','Staff']);
    for(const [name,value] of Object.entries({staffName:'Permission Staff',staffEmail:'staff@example.test',staffPassword:'password123',staffCity:'Hyderabad',staffBranch:branches[0]._id}))await named(name,value);
    await ev('Array.from(document.querySelectorAll("label")).find(e=>e.textContent.includes("Accounts & collections"))?.querySelector("input").click()');await click('Create staff account');await text('Staff account created.');
    const created=JSON.parse(requests.find(r=>r.url==='/workspace/staff'&&r.method==='POST').body);assert.equal(created.role,'employee');assert.deepEqual(created.permissions,['bookings','accounts']);
    await click('Edit access');await text('Edit access: Permission Staff');await named('accessRole','employee');await click('Save access');await text('Account role and work permissions updated.');await until('!document.body.innerText.includes("Loading your company workspace")');await sleep(100);assert.ok(requests.some(r=>r.method==='PATCH'&&r.url.endsWith('/access')));
    assert.equal(await ev('document.querySelector("[name=staffRole]").selectedOptions[0].text'),'Staff','Role selection must stay Staff after refreshing the team');
    await fs.writeFile(path.resolve('docs/three-role-team.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await session('subadmin',['bookings','loading','delivery','accounts','reports','team']);await go('/workspace/team');
    assert.deepEqual(await ev('Array.from(document.querySelector("[name=staffRole]").options).map(o=>o.text)'),['Staff']);assert.equal(await ev('document.querySelectorAll("[name=staffBranch] option").length'),2);
    await session('employee',['reports']);await go('/workspace/dashboard');await text('My work dashboard');
    assert.equal(await ev('Array.from(document.querySelectorAll("app-logistics-shell nav a")).some(a=>a.getAttribute("href")==="/workspace-booking")'),false);assert.equal(await ev('Array.from(document.querySelectorAll("app-logistics-shell nav a")).some(a=>a.getAttribute("href")==="/workspace/team")'),false);assert.equal(await ev('Array.from(document.querySelectorAll("app-logistics-shell nav a")).some(a=>a.getAttribute("href")==="/workspace/reports")'),true);
    await call('Page.navigate',{url:'http://127.0.0.1:4280/booking'});await text('My work dashboard');assert.ok(await ev('location.pathname==="/workspace/dashboard"'));
    await call('Page.navigate',{url:'http://127.0.0.1:4280/login'});await text('Email / Username / Mobile number');assert.equal(await ev('!!document.querySelector("a.company-entry")'),true);
    assert.deepEqual(errors,[]);console.log('PASS: three clear roles, Company Admin create/edit permissions, Branch Admin own branch only, Staff menus/route guard, Team login with separate company entry. Mock APIs only.');await call('Browser.close');
  }else if(process.argv.includes('--parcel')){
    await call('Page.navigate',{url:'http://127.0.0.1:4280/booking'});await text('Shipment route & booking details');await text('Package details');await text('Grand total');
    await fill('quantity','2');await fill('unitPrice','100.25');await fill('serviceCharges','10');await fill('parcelGstAmount','2.5');await fill('bookingType','paid');
    assert.equal(await ev('Number(document.querySelector("[formControlName=grandTotal]").value)'),213,'Existing booking must include freight, service and entered GST');
    await fill('bookingType','FOC');assert.equal(await ev('Number(document.querySelector("[formControlName=grandTotal]").value)'),0,'FOC preview must match server freight');
    assert.ok(await ev('!!document.querySelector(".classic-booking-form table [formControlName=quantity]")'),'Original package table must be preserved');assert.ok(await ev('document.querySelector("app-search-grn-number").getBoundingClientRect().height>0'),'GRN search must remain open');
    assert.ok(await ev('Array.from(document.querySelectorAll("#parcel-booking-form label")).filter(e=>e.getBoundingClientRect().height>0).every(e=>parseFloat(getComputedStyle(e).fontSize)>=12)'), 'Visible field labels must be readable');
    assert.ok(await ev('Array.from(document.querySelectorAll("#parcel-booking-form select.form-select")).filter(e=>e.getBoundingClientRect().height>0).every(e=>{const s=getComputedStyle(e);return e.clientHeight-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom)>=parseFloat(s.lineHeight);})'), 'Dropdown text must fit inside its padded content area');
    await fs.writeFile(path.resolve('docs/parcel-booking-desktop.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
    await click('Review booking');assert.equal(await ev('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="Review booking").getAttribute("data-bs-toggle")'),null,'Incomplete booking must not open confirmation');
    await ev('document.querySelector(".toast-close-button")?.click()');await sleep(200);
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);
    assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+1'),'Existing booking mobile overflow');assert.ok(await ev('document.querySelector(".classic-booking-card").getBoundingClientRect().width>300'),'Existing mobile booking form too narrow');assert.ok(await ev('Array.from(document.querySelectorAll(".classic-booking-form .select2-container")).every(e=>e.getBoundingClientRect().right<=document.querySelector(".classic-booking-card").getBoundingClientRect().right)'),'Searchable branch selectors must fit the mobile card');
    await fs.writeFile(path.resolve('docs/parcel-booking-mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    assert.deepEqual(errors,[]);console.log('PASS: existing /booking route, redesigned form sections, invalid preview guard, mobile width, no browser exceptions. Mock APIs only.');await call('Browser.close');process.exitCode=0;
  }else{
  if(process.argv.includes('--delhivery')){
    await go('/workspace/services');await click('Reconnect Delhivery');await text('API token');
    for(const [name,value] of Object.entries({apiToken:'qa-token-not-real',clientName:'QA Registered Client',sellerGst:'36ABCDE1234F1Z5',testPin:'500016'}))await ev('(()=>{const e=document.querySelector("[name='+name+']");e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    await click('Test & save');await until('!document.querySelector("[name=apiToken]")');
    const connected=JSON.parse(requests.find(r=>r.url==='/workspace/services/delhivery/connect'&&r.method==='POST').body);assert.equal(connected.environment,'staging');assert.equal(connected.clientName,'QA Registered Client');assert.equal(connected.password,undefined);
    await until('!!Array.from(document.querySelectorAll("input")).find(e=>e.placeholder==="Exact registered warehouse name")');
    await ev('(()=>{const e=Array.from(document.querySelectorAll("input")).find(e=>e.placeholder==="Exact registered warehouse name");e.value="QA Hyderabad Warehouse";e.dispatchEvent(new Event("input",{bubbles:true}));})()');await click('Save mapping');await text('Delhivery pickup mapping saved');
    assert.ok(requests.some(r=>r.method==='PATCH'&&r.url.endsWith('/courier')));assert.equal(await ev('JSON.stringify(localStorage).includes("qa-token-not-real")'),false);
  }
  for(const route of ['dashboard','company','subscription','branches','team','services','allowance','bookings','operations','reports']){await go('/workspace/'+route);assert.equal(await ev('document.querySelectorAll(".error").length'),0,'UI error on '+route);}
  await go('/workspace/services');assert.ok(await ev('Array.from(document.querySelectorAll("a")).some(a=>a.href==="https://one.delhivery.com/")'));
  for(const own of [true,false]){
    await go('/workspace-booking');await text('Route & destination');
    for(const [k,v] of Object.entries({toCity:own?'Vijayawada':'Delhi',destinationPostalCode:own?'520010':'110001',receiverState:own?'Andhra Pradesh':'Delhi'}))await fill(k,v);
    await click('Continue');for(const [k,v] of Object.entries({senderName:'Test Sender',senderMobile:'9999999999',senderAddress:'Origin road 12',receiverName:'Test Receiver',receiverMobile:'8888888888',receiverAddress:'Destination road 34'}))await fill(k,v);
    await click('Continue');await fill('contains','Books');await fill('unitPrice','50');await fill('valueOfGoods','1000');await click('Check coverage');await text('Choose the service');await click(own?'QA Logistics':'Delhivery Surface');await click('Continue');await text('Review & confirm');
    if(own)await fill('bookingType','FOC');
    else {await fill('hsCode','4901');await fill('shippingInvoice','QA-INVOICE-1');}
    await ev('document.querySelector("[formControlName=accepted]").click()');await click('Confirm booking');await text('Booking confirmed');
    const request=requests.filter(r=>r.url==='/workspace/bookings'&&r.method==='POST').at(-1);assert.ok(Object.keys(request.headers).some(k=>k.toLowerCase()==='idempotency-key'));assert.equal(JSON.parse(request.body).expectedAmount,own?0:80);
  }
  assert.equal(context.quota.used,2);assert.equal(context.quota.available,9998);
  await go('/workspace/reports');await text('QA/1001');await text('QA/1002');
  await fs.writeFile(path.resolve('docs/logistics-workspace.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const route of ['dashboard','branches','services','reports']){await go('/workspace/'+route);assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+1'),'Mobile overflow '+route);}
  await go('/workspace-booking');await text('Route & destination');assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+1'),'Mobile booking overflow');assert.ok(await ev('document.querySelector(".layout form").getBoundingClientRect().width >= innerWidth-70'),'Mobile form should occupy the available width');
  await fs.writeFile(path.resolve('docs/logistics-booking-mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  assert.deepEqual(errors,[]);console.log('PASS: 10 workspace pages, Delhivery company connection and branch mapping, wallet portal link, own FOC and Delhivery booking, stable request key, report rows and mobile layout. Mock APIs only.');
  await call('Browser.close');
  }
}finally{ws?.close();chrome.kill();server.close();}
