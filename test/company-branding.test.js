import { test } from 'node:test';
import assert from 'node:assert/strict';
import Company from "../src/models/company.model.js";
import mongoose from 'mongoose';
import { QuotaEvent } from "../src/models/logistics.model.js";
import Subadmin from "../src/models/admin.auth.model.js";
import { publicBranding, logoMime, logoLetters } from "../src/utils/company-branding.js";
import { getCompanyBranding } from "../src/controllers/company-branding.controller.js";
import companyController from "../src/controllers/company.controller.js";
import staffController from "../src/controllers/admin.auth.controller.js";
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, set() { return this; }, json(body) { this.body = body; return this; } });
const id = '507f1f77bcf86cd799439011';
test('public company branding includes logo text and excludes image and private fields', () => {
  const png = Buffer.from([137,80,78,71,13,10,26,10]);
  assert.equal(logoMime(png),'image/png');
  const result = publicBranding({_id:id,name:'Acme',logo:png.toString('base64'),password:'secret',email:'private@example.com',billing:{}});
  assert.deepEqual(Object.keys(result),['companyId','name','logoText']);
  assert.equal(result.logoText,'AC');
  assert.equal(publicBranding({_id:id,name:'Acme',logoText:'  XY  '}).logoText,'XY');
  assert.equal(publicBranding({_id:id,name:'Acme',logoText:'   '}).logoText,'AC');
});
test('invalid company link is rejected before querying the database', async () => {
  const res=response(); await getCompanyBranding({params:{companyId:'bad'}},res,error=>{throw error;});
  assert.equal(res.code,400);
});
test('branding lookup excludes blocked companies and restricts selected fields', async t => {
  t.mock.method(Company,'findOne',filter=>{
    assert.deepEqual(filter,{_id:id,isBlocked:{$ne:true}});
    return {select:fields=>{assert.equal(fields,'_id name logoText');return {lean:async()=>({_id:id,name:'Acme',logoText:'XY'})};}};
  });
  const res=response(); await getCompanyBranding({params:{companyId:id}},res,error=>{throw error;});
  assert.equal(res.body.name,'Acme'); assert.equal(res.body.logoText,'XY');
});
test('company branded login rejects credentials belonging to another company', async t => {
  t.mock.method(Company,'findOne',()=>({populate:async()=>({_id:id})}));
  const res=response();
  await companyController.loginCompany({body:{email:'owner@example.com',password:'password123',companyId:'507f1f77bcf86cd799439022'}},res);
  assert.equal(res.code,401);
});
test('staff branded login scopes credentials to the company in the link', async t => {
  t.mock.method(Subadmin,'findOne',filter=>{
    assert.equal(filter.companyId,id);
    const query={populate(){return this;},then(resolve){return Promise.resolve(null).then(resolve);}};
    return query;
  });
  const res=response();
  await staffController.login({body:{identifier:'staff@example.com',password:'password123',companyId:id}},res);
  assert.equal(res.code,404);
});
test('logo uploads reject active SVG content before registration database writes', async () => {
  const res=response();
  await companyController.registerCompany({body:{name:'Acme',email:'owner@example.com',password:'password123'},file:{buffer:Buffer.from('<svg></svg>')}},res);
  assert.equal(res.code,400);
});
test('logo text rejects objects and overlong input before registration or update', async () => {
  for (const logoText of [{ $set: 'bad' }, 'a'.repeat(61), 'ABC', 'A', '12']) {
    for (const handler of [companyController.registerCompany, companyController.updateCompany]) {
      const res=response();
      await handler({body:{name:'Acme',email:'owner@example.com',password:'password123',logoText}},res);
      assert.equal(res.code,400);
    }
  }
});
test('registration saves the supplied logo text without requiring an image', async t => {
  t.mock.method(Company,'findOne',async()=>null);
  t.mock.method(mongoose,'startSession',async()=>({withTransaction:fn=>fn(),endSession:async()=>{}}));
  t.mock.method(QuotaEvent,'create',async rows=>rows);
  t.mock.method(Company,'create',async ([data])=>{assert.equal(data.logoText,'XY');assert.equal(data.logo,'');return [new Company(data)];});
  const res=response();
  await companyController.registerCompany({body:{name:'Acme',email:'owner@example.com',password:'password123',logoText:'  XY  '}},res);
  assert.equal(res.code,201);
});
test('company initials are stable with optional two-letter override and legacy fallback', () => {
  assert.equal(logoLetters('ABC Logistics'),'AL');
  assert.equal(logoLetters('Acme'),'AC');
  assert.equal(logoLetters('ABC Logistics','xy'),'XY');
  assert.equal(logoLetters('ABC Logistics','Old long logo text'),'AL');
  assert.equal(logoLetters('A'),'AA');
});
