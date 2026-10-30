import fs from 'node:fs';
import path from 'node:path';
import { REPORT_PATHS } from '../utils/report-pagination.js';

// Read source only: generating the collection never starts the server or calls an API.
const root = process.cwd();
const read = p => fs.readFileSync(path.resolve(root, p), 'utf8');
const clean = s => s.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const index = clean(read('routes/index.js'));
const imports = Object.fromEntries([...index.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)].map(m => [m[1], path.posix.normalize('routes/' + m[2])]));
const variables = { baseUrl: 'http://localhost:4000', companyToken: '', token: '', companyEmail: 'company@example.com', companyPassword: 'ChangeMe123!', identifier: 'admin@example.com', password: 'ChangeMe123!', fromDate: '2026-10-01', toDate: '2026-10-29', date: '2026-10-29', id: '', companyId: '', branchId: '', pickUpBranch: '', dropBranch: '', branchUniqueId: '', subadminUniqueId: '', adminUniqueId: '', grnNo: '1001', lrNumber: 'REPLACE_WITH_EXISTING_LR', voucherNo: '1001', vocherNoUnique: '1001', voucher: '1001', fromCity: 'Hyderabad', toCity: 'Vijayawada', city: 'Hyderabad', name: 'Sample', branchName: 'Main Branch', branchCode: '', agentName: '', parentCompanyId: '', senderMobile: '9000000001', phone: '9000000001', vehicleNo: 'TS09AB1234', vehicalNumber: 'TS09AB1234', status: 'active', assetType: 'Equipment', expenditureType: 'Fuel' };
const examples = { name: 'Sample', email: 'sample@example.com', password: '{{password}}', identifier: '{{identifier}}', username: 'sample_admin', address: 'Sample street', phone: '9000000001', mobile: '9000000001', state: 'Telangana', country: 'India', location: 'Main Road', pincode: 500001, role: 'admin', documents: [], branchType: 'normal', openingBalance: 0, bookingType: 'paid', bookingStatus: 0, parcelStatus: 0, reportType: 'sender', senderName: 'Test Sender', receiverName: 'Test Receiver', senderMobile: 9000000001, receiverMobile: 9000000002, senderAddress: 'Hyderabad', receiverAddress: 'Vijayawada', senderGst: '', receiverGst: '', grandTotal: 100, totalPrice: 100, totalPackages: 1, totalQuantity: 1, items: 1, actualWeight: 5, agent: '', dispatchType: 'Road', packages: [{quantity: 1, packageType: 'Box', contains: 'Clothes', weight: 5, unitPrice: 100, totalPrice: 100, actulWeight: '5'}], isActive: true, primary: false, value: 100, amount: 100, charge: 10, serviceCharge: 10, loadingCharge: 10, cartageCharge: 10, GST: '0', modeOnPrice: 'weight', vehicleType: 'Truck', registrationNo: 'TS09AB1234', RC: 'TEST-RC', fuelType: 'DIESEL', vehicleStatus: 'active', polutionExpDate: '2027-10-29', grnNumbers: [1001], updateFields: {remarks: 'Updated during testing'}, cityIds: ['{{id}}'], remarks: 'Postman test', notes: 'Postman test', description: 'Postman test', accountType: 'bank', accountName: 'Test Account', accountCode: 'TEST001', currency: 'INR', accountNumber: '1234567890', bankName: 'Test Bank', ifsc: 'TEST0000001', invoice: 'TEST-INV-001', paidThrough: 'cash', expenseType: 'Fuel', category: '{{id}}', oldPassword: '{{password}}', newPassword: 'NewPassword123!', otp: '123456', refundAmount: 0, toPayDeliveredAmount: 100, plan: 'monthly', bookingLimit: 1000, searchCustomer: 'Test Sender', grnlrn: '{{lrNumber}}', unit: 'pcs', type: 'Goods', salesInfo: {sellingPrice: 100, account: 'Sales', description: 'Test'}, purchaseInfo: {costPrice: 80, account: 'Purchases', description: 'Test', preferredVendor: ''}, bankDetails: {accountNumber: '1234567890', accountName: 'Test Vendor', bankName: 'Test Bank', branchName: 'Main', ifscCode: 'TEST0000001'}, companyName: 'Test Vendor Company', displayName: 'Test Vendor', workPhone: '9000000001', creditForAgent: 'Test Sender', missingReason: 'Test missing report', expenditureStatus: 0 };
function sample(key) {
  if (key in examples) return examples[key];
  if (key in variables) return '{{' + key + '}}';
  if (/^(startDate|fromBookingDate)$/.test(key)) return '{{fromDate}}';
  if (/^(endDate|toBookingDate)$/.test(key)) return '{{toDate}}';
  if (/date$/i.test(key)) return '{{date}}';
  if (/^(fromBranch|branch|unloadBranch|deliveryBranch)$/.test(key)) return '{{pickUpBranch}}';
  if (/^toBranch$/.test(key)) return '{{dropBranch}}';
  if (/(Charge|Charges|Amount|Weight|Limit|valueOfGoods)$/i.test(key)) return 0;
  if (/^(bookedBy|missingByUser|cancelByUser)$/.test(key)) return '{{id}}';
  return 'Sample ' + key;
}
function fields(source, kind) {
  const keys = new Set();
  const re = new RegExp('(?:const|let)\\s*\\{([^;]*?)\\}\\s*=\\s*req\\.' + kind, 'g');
  for (const m of source.matchAll(re)) for (const part of m[1].split(',')) { const key = part.trim().match(/^(\w+)/)?.[1]; if (key) keys.add(key); }
  for (const m of source.matchAll(new RegExp('req\\.' + kind + '\\??\\.(\\w+)', 'g'))) keys.add(m[1]);
  return [...keys];
}
const collection = {info: {name: 'Cargo Logistics - All Mounted APIs', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', description: 'Requests generated from mounted Express routes and controller inputs. Set collection variables before sending. Examples require existing records and appropriate roles. See README.md for backend issues and setup.'}, variable: [], item: []};
const records = [];
for (const mount of index.matchAll(/app\.use\(['"]([^'"]+)['"],\s*(\w+)\)/g)) {
  const routeFile = imports[mount[2]];
  const routeSource = clean(read(routeFile));
  const controllers = Object.fromEntries([...routeSource.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+controller[^'"]*)['"]/g)].map(m => [m[1], path.posix.normalize('routes/' + m[2])]));
  const folder = {name: mount[1].slice(1), item: []};
  for (const match of routeSource.matchAll(/^\s*router\.(get|post|put|patch|delete)\(\s*['"]([^'"]*)['"]\s*,([^\r\n]*)/gm)) {
    const [, verb, suffix, handlers] = match;
    const method = verb.toUpperCase();
    const route = mount[1] + (suffix === '/' ? '' : suffix);
    const handler = handlers.match(/(\w+)\.(\w+)\s*\)/);
    let source = '';
    let controllerFile = '';
    if (handler && controllers[handler[1]]) {
      controllerFile = controllers[handler[1]];
      const whole = clean(read(controllerFile));
      const starts = [...whole.matchAll(/^\s*(?:export\s+)?const\s+(\w+)\s*=\s*async\s*\(\s*req\s*,\s*res\s*\)/gm)];
      const n = starts.findIndex(m => m[1] === handler[2]);
      if (n >= 0) source = whole.slice(starts[n].index, starts[n + 1]?.index ?? whole.length);
    }
    const auth = /\bcompanyAuth\b/.test(handlers) ? 'companyToken' : /\bauth\b/.test(handlers) ? 'token' : null;
    let body = Object.fromEntries(fields(source, 'body').map(k => [k, sample(k)]));
    const queryKeys = fields(source, 'query');
    if (handler?.[2] in REPORT_PATHS) {
      for (const key of ['page', 'limit']) if (!queryKeys.includes(key)) queryKeys.push(key);
    }
    if (handler?.[2] === 'createBooking') body = Object.fromEntries(['fromCity','toCity','pickUpBranch','dropBranch','dispatchType','bookingType','packages','senderName','senderMobile','senderAddress','receiverName','receiverMobile','receiverAddress','grandTotal','serviceCharges','hamaliCharges','doorDeliveryCharges','doorPickupCharges','parcelGstAmount','valueOfGoods','items'].map(k => [k, sample(k)]));
    if (handler?.[2] === 'loginCompany') body = {email: '{{companyEmail}}', password: '{{companyPassword}}'};
    if (['createParcel', 'createBranchToBranch'].includes(handler?.[2])) body = {fromCity: '{{fromCity}}', toCity: ['{{toCity}}'], fromBranch: '{{pickUpBranch}}', vehicalNumber: '{{vehicalNumber}}', driverName: 'Test Driver', driverNo: 9000000001, grnNo: [1001], lrNumber: ['{{lrNumber}}'], remarks: 'Postman test'};
    if (handler?.[2] === 'createParcelUnloading') body = {vehicalNumber: '{{vehicalNumber}}', branch: '{{dropBranch}}', bookingType: 'paid', grnNo: [1001], lrNumber: ['{{lrNumber}}']};
    if (handler?.[2] === 'parcelBranchToBranchUnloadingPost') body = {unloadBranch: '{{dropBranch}}', grnNo: [1001], lrNumber: ['{{lrNumber}}'], remarks: 'Postman test'};
    if (handler?.[2] === 'deliveryBooking') body = {grnNo: 1001, receiverName: 'Test Receiver', receiverMobile: 9000000002, toPayDeliveredAmount: 100};
    if (handler?.[2] === 'deletePersons') body = {id: '{{id}}'};
    if (handler?.[2] === 'createCFVoucher') body = {grnNo: [1001]};
    if (handler?.[2] === 'registerSubsidiaryCompany') body = {...body, email: '{{companyEmail}}', password: '{{companyPassword}}', parentCompanyId: null};
    const fallback = {updateCompany: {name: 'Updated Company'}, updateBookings: {remarks: 'Updated booking'}, updateGRNBookings: {remarks: 'Updated booking'}, updateDelivery: {receiverName: 'Updated Receiver'}, updateBranch: {name: 'Updated Branch'}, updateMaster: {name: 'Updated Agent'}, updateCFExtraCharge: {charge: 20}, updateCFVoucher: {charge: '20'}, updateChargeById: {serviceCharge: 20}, updateVehicle: {vehicleStatus: 'active'}, updateCity: {cityName: 'Hyderabad'}, updateAsset: {value: 200}, updateParcel: {remarks: 'Updated loading'}, updateParcelUnloading: {remarks: 'Updated unloading'}, createExpenseType: {accountType: 'expense', accountName: 'Fuel', accountCode: 'FUEL', description: 'Fuel expense', isActive: true}, updateExpenseType: {accountName: 'Fuel'}, createCustomer: {name: 'Test Customer', mobile: 9000000001}, updateCustomer: {name: 'Updated Customer'}, createAccountCat: {name: 'Transport'}, updateAccountCat: {name: 'Transport'}, createAccountSubCat: {category: '{{id}}', name: 'Fuel'}, updateAccountSubCat: {name: 'Fuel'}, updateExpense: {amount: 200}};
    if (!Object.keys(body).length && fallback[handler?.[2]]) body = fallback[handler[2]];
    if (route.startsWith('/parcel-loading') && Array.isArray(body.toCity) === false && 'toCity' in body && ['createParcel','createBranchToBranch'].includes(handler?.[2])) body.toCity = ['{{toCity}}'];
    if (['createParcel','createBranchToBranch','createParcelUnloading','parcelBranchToBranchUnloadingPost','createCFVoucher'].includes(handler?.[2])) { if ('grnNo' in body) body.grnNo = [1001]; if ('lrNumber' in body) body.lrNumber = ['{{lrNumber}}']; }
    if (route === '/shiprocket/create-order') body = {order_id: 'TEST-{{$timestamp}}', order_date: '{{date}}', pickup_location: 'REPLACE_WITH_SHIPROCKET_PICKUP_LOCATION', billing_customer_name: 'Test', billing_last_name: 'Customer', billing_address: 'Sample street', billing_city: 'Hyderabad', billing_pincode: 500001, billing_state: 'Telangana', billing_country: 'India', billing_email: 'test@example.com', billing_phone: 9000000001, shipping_is_billing: true, order_items: [{name: 'Test Item', sku: 'TEST001', units: 1, selling_price: 100}], payment_method: 'Prepaid', sub_total: 100, length: 10, breadth: 10, height: 10, weight: 0.5};
    const urlPath = route.replace(/:(\w+)/g, (_, k) => { if (!(k in variables)) variables[k] = ''; return '{{' + k + '}}'; });
    const query = queryKeys.map(key => ({key, value: key === 'page' ? '1' : key === 'limit' ? '25' : key === 'query' ? 'Test' : sample(key).toString()}));
    const raw = '{{baseUrl}}' + urlPath + (query.length ? '?' + query.map(q => q.key + '=' + q.value).join('&') : '');
    const description = `Source: ${routeFile}${controllerFile ? ' -> ' + controllerFile + ' (' + handler[2] + ')' : ''}. ${auth ? 'Requires ' + auth + '.' : 'No authentication middleware on this route.'} Sample fields must be replaced with your test data.`;
    const request = {method, header: [], auth: auth ? {type: 'bearer', bearer: [{key: 'token', value: '{{' + auth + '}}', type: 'string'}]} : {type: 'noauth'}, url: {raw, host: ['{{baseUrl}}'], path: urlPath.slice(1).split('/'), ...(query.length ? {query} : {})}, description};
    if (Object.keys(body).length || ['POST','PATCH','PUT'].includes(method)) { request.header.push({key: 'Content-Type', value: 'application/json'}); request.body = {mode: 'raw', raw: JSON.stringify(body, null, 2), options: {raw: {language: 'json'}}}; }
    const item = {name: method + ' ' + route, request, response: []};
    if (handler?.[2] in REPORT_PATHS) {
      request.description += ' Pagination: page defaults to 1; limit defaults to 25 and is capped at 100. Totals cover the complete filtered report.';
      item.event = [{listen: 'test', script: {type: 'text/javascript', exec: [
        'if (pm.response.code === 200) {',
        "  pm.test('Report includes valid pagination', function () {",
        '    const p = pm.response.json().pagination;',
        '    pm.expect(p).to.be.an("object");',
        '    pm.expect(p.page).to.be.at.least(1);',
        '    pm.expect(p.limit).to.be.within(1, 100);',
        '    pm.expect(p.returnedRecords).to.be.at.most(p.limit);',
        '    pm.expect(p.totalRecords).to.be.at.least(p.returnedRecords);',
        '  });',
        '}',
      ]}}];
    }
    if (route.endsWith('/login')) {
      const variable = route.startsWith('/company/') ? 'companyToken' : 'token';
      item.event = [{listen: 'test', script: {type: 'text/javascript', exec: ['if (pm.response.code >= 200 && pm.response.code < 300) {', '  const data = pm.response.json();', `  if (data.token) pm.collectionVariables.set('${variable}', data.token);`, '}']}}];
    }
    folder.item.push(item);
    records.push({route, method, auth, body: request.body ? body : null, query, description});
  }
  collection.item.push(folder);
}
collection.item.push({name: 'system', item: [{name: 'GET /health', request: {method: 'GET', header: [], auth: {type: 'noauth'}, url: {raw: '{{baseUrl}}/health', host: ['{{baseUrl}}'], path: ['health']}, description: 'Returns 200 when MongoDB is connected; otherwise 503.'}, response: []}]});
records.push({route: '/health', method: 'GET', auth: null, body: null, query: []});
collection.variable = Object.entries(variables).map(([key,value]) => ({key,value,type:'string'}));
fs.mkdirSync('postman', {recursive:true});
fs.writeFileSync('postman/cargo-logistics.postman_collection.json', JSON.stringify(collection,null,2) + '\n');
fs.writeFileSync('postman/cargo-logistics.postman_environment.json', JSON.stringify({name: 'Cargo Logistics Local', values: [{key:'baseUrl',value:variables.baseUrl,enabled:true}], _postman_variable_scope:'environment'},null,2) + '\n');
const quote = s => "'" + s.replace(/'/g, "'\\''") + "'";
let curl = '# Cargo Logistics cURL commands\n\nPaste any command into Postman > Import > Raw text. Replace placeholders with your own data first. These are Bash-style cURL commands; use Postman import on Windows.\n\n';
for (const r of records) {
  let url = variables.baseUrl + r.route.replace(/:(\w+)/g, (_, k) => variables[k] || 'REPLACE_' + k);
  if (r.query.length) url += '?' + r.query.map(q => q.key + '=' + encodeURIComponent(q.value.replace(/\{\{(\w+)\}\}/g, (_,k) => variables[k] || 'REPLACE_' + k))).join('&');
  let command = 'curl --request ' + r.method + ' --url ' + quote(url);
  if (r.auth) command += ' --header ' + quote('Authorization: Bearer REPLACE_' + r.auth);
  if (r.body) command += ' --header ' + quote('Content-Type: application/json') + ' --data-raw ' + quote(JSON.stringify(r.body,null,2).replace(/\{\{(\w+)\}\}/g, (_,k) => variables[k] || 'REPLACE_' + k));
  curl += `## ${r.method} ${r.route}\n\n\x60\x60\x60bash\n${command}\n\x60\x60\x60\n\n`;
}
fs.writeFileSync('postman/curl-commands.md', curl);
console.log(JSON.stringify({folders:collection.item.length, requests:records.length, emptyWriteBodies:records.filter(r => ['POST','PATCH'].includes(r.method) && r.body && !Object.keys(r.body).length).map(r=>r.route)},null,2));
