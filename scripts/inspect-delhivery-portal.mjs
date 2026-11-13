// Public portal inspection only. Never logs credentials, tokens or cookies.
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const WebSocket=globalThis.WebSocket||createRequire(new URL('../../crm-frontend/package.json',import.meta.url))('ws');
const profile=await mkdtemp(path.join(tmpdir(),'cargo-delhivery-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--incognito','--disable-gpu','--no-first-run','--remote-debugging-port=9338','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));let ws;
try {
  let tabs;for(let i=0;i<60;i++){try{tabs=await(await fetch('http://127.0.0.1:9338/json')).json();if(tabs.some(t=>t.type==='page'))break;}catch{}await pause(100);}
  if(!tabs?.length)throw Error('Browser did not start');
  ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const pending=new Map();ws.onmessage=event=>{const r=JSON.parse(event.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result);}};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
  await call('Page.enable');await call('Page.navigate',{url:'https://one.delhivery.com/'});await pause(10000);
  const result=await call('Runtime.evaluate',{expression:'JSON.stringify({url:location.origin+location.pathname,title:document.title,text:document.body.innerText.slice(0,1800),inputs:Array.from(document.querySelectorAll("input")).map(e=>({type:e.type,name:e.name,id:e.id,placeholder:e.placeholder})),buttons:Array.from(document.querySelectorAll("button")).map(e=>e.innerText)})',returnByValue:true});
  console.log(result.result.value);
  await call('Browser.close');
}finally{ws?.close();chrome.kill();await pause(300);const resolved=path.resolve(profile);if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('cargo-delhivery-'))await rm(resolved,{recursive:true,force:true}).catch(()=>{});}
