import axios from 'axios';
import { ApiError } from '../utils/api-error.js';
import { money } from './booking-calculation.js';
import { encryptCredentials, decryptCredentials } from './courier-secrets.js';
import { CourierConnection } from '../models/logistics.model.js';

const hosts={staging:'https://staging-express.delhivery.com',production:'https://track.delhivery.com'};
const pin=value=>{const text=String(value||'').trim();if(!/^\d{6}$/.test(text))throw new ApiError(400,'Delhivery needs a six-digit Indian PIN code');return text;};
const text=(value,label,max=150)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new ApiError(400,`Provide ${label}`);return value.trim();};
export const delhiveryReference=b=>`${b.companyId}-${b.grnNo}`;

// Never propagate Axios config/headers/provider bodies: they may contain tokens.
export async function delhiveryRequest(connection,method,path,{params,data,form=false}={}){
  const baseURL=hosts[connection.environment];if(!baseURL)throw new ApiError(409,'Choose the Delhivery staging or production environment');
  let apiToken;
  try{apiToken=decryptCredentials(connection.credentials).apiToken;if(typeof apiToken!=='string'||!apiToken)throw Error();}catch{const e=new ApiError(503,'Delhivery credentials are unavailable; reconnect this company account');e.definitive=true;throw e;}
  try{
    const response=await axios({baseURL,url:path,method,params,data,headers:{Authorization:`Token ${apiToken}`,Accept:'application/json',...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{'Content-Type':'application/json'})},timeout:20000,maxRedirects:0,maxContentLength:4*1024*1024});
    return response.data;
  }catch(error){const status=error.response?.status,e=new ApiError(status===401||status===403?403:status===429?429:status===400||status===422?422:502,status===401||status===403?'Delhivery API token was rejected. Reconnect the correct account/environment.':status===429?'Delhivery rate limit reached; wait before refreshing.':status===400||status===422?'Delhivery rejected the request. Check the registered warehouse, address and shipment details.':'Delhivery response unavailable. Check the existing shipment before retrying.');
    // A manifestation rejection can still have partially saved a package. Only
    // an authentication rejection conclusively means no order was accepted.
    e.definitive=[401,403].includes(status);throw e;}
}

export async function connectDelhivery(companyId,input){
  const environment=input.environment;if(!Object.hasOwn(hosts,environment))throw new ApiError(400,'Select staging or production');
  const apiToken=text(input.apiToken,'Delhivery API token',500);if(/\s/.test(apiToken))throw new ApiError(400,'Enter the API token without spaces or the Token prefix');
  const clientName=text(input.clientName,'registered Delhivery client name');
  const sellerGst=String(input.sellerGst||'').trim().toUpperCase();if(!/^\d{2}[A-Z0-9]{13}$/.test(sellerGst))throw new ApiError(400,'Provide the registered 15-character seller GSTIN');
  const credentials=encryptCredentials({apiToken}),candidate={credentials,environment};
  const testPin=pin(input.testPin||'500001');
  const verified=await delhiveryRequest(candidate,'GET','/api/kinko/v1/invoice/charges/.json',{params:{md:'S',cgm:1000,o_pin:testPin,d_pin:testPin,ss:'Delivered'}});
  if(!Array.isArray(verified)||!verified.length||verified[0]?.total_amount==null||verified[0]?.total_amount===''||!Number.isFinite(Number(verified[0]?.total_amount)))throw new ApiError(422,'Delhivery shipping-rate access could not be verified for this token/environment');
  const row=await CourierConnection.findOneAndUpdate({companyId,providerKey:'delhivery'},{$set:{credentials,environment,clientName,sellerGst,accountLabel:String(input.accountLabel||clientName).slice(0,150),connected:true},$unset:{token:1,tokenExpiresAt:1}}, {upsert:true,new:true,runValidators:true});
  return {connected:true,enabled:!!row.enabled,environment,clientName,accountLabel:row.accountLabel};
}

export function validateDelhiveryParcel(input,origin){
  if(input.category!=='domestic'||String(input.destinationCountry).toLowerCase()!=='india')throw new ApiError(422,'Delhivery Express adapter currently supports domestic India shipments only');
  pin(origin.pincode);pin(input.destinationPostalCode);
  if(!origin.delhiveryPickupLocation?.trim())throw new ApiError(422,'Company Admin must map this branch to its registered Delhivery pickup warehouse in Courier Services');
  if(input.packages.length!==1||input.packages[0].quantity!==1)throw new ApiError(422,'Book one physical parcel at a time with its combined contents, total weight and outer dimensions');
}
export async function delhiveryQuotes(connection,input,origin){
  validateDelhiveryParcel(input,origin);
  const coverage=await delhiveryRequest(connection,'GET','/c/api/pin-codes/json/',{params:{filter_codes:pin(input.destinationPostalCode)}});
  const service=coverage.postal_codes?.map(p=>p.postal_code).find(p=>String(p?.pin)===pin(input.destinationPostalCode));
  if(!service||String(service.pre_paid).toUpperCase()!=='Y')return [];
  const cgm=Math.ceil(input.packages[0].weight*1000);
  const results=await Promise.allSettled(['S','E'].map(async mode=>{
    const rates=await delhiveryRequest(connection,'GET','/api/kinko/v1/invoice/charges/.json',{params:{md:mode,cgm,o_pin:pin(origin.pincode),d_pin:pin(input.destinationPostalCode),ss:'Delivered'}});
    const raw=rates?.[0]?.total_amount;if(raw===null||raw===''||raw===undefined)throw new ApiError(502,'Delhivery did not return a usable rate');
    const amount=money(raw,'Delhivery rate');return {providerKey:'delhivery',courierId:mode,name:`Delhivery ${mode==='S'?'Surface':'Express'}`,amount,currency:'INR',estimated:true,weightGrams:cgm};
  }));
  const quotes=results.filter(r=>r.status==='fulfilled').map(r=>r.value).sort((a,b)=>a.amount-b.amount);
  if(!quotes.length)throw results[0].reason;
  return quotes;
}
export async function fetchDelhiveryWaybill(connection){
  const value=await delhiveryRequest(connection,'GET','/waybill/api/fetch/json/',{params:{cl:connection.clientName}});
  const awb=String(value||'').trim();if(!/^\d{8,30}$/.test(awb))throw new ApiError(502,'Delhivery did not return a valid waybill');return awb;
}
export function delhiveryPayload(connection,b,origin){
  validateDelhiveryParcel(b,origin);
  const p=b.packages[0],invoice=b.shippingInvoice;
  if(!/^\d{4,10}$/.test(b.hsCode||''))throw new ApiError(400,'Provide the goods HSN code for Delhivery');
  if(!invoice)throw new ApiError(400,'Provide the seller invoice reference for Delhivery');
  if(b.valueOfGoods>50000&&!/^\d{12}$/.test(b.goodsEwaybill||''))throw new ApiError(400,'Provide the actual 12-digit goods e-waybill for the declared value');
  return {pickup_location:{name:origin.delhiveryPickupLocation},shipments:[{waybill:b.provider.awb,order:delhiveryReference(b),client:connection.clientName,name:b.receiverName,add:b.receiverAddress,pin:pin(b.destinationPostalCode),city:b.toCity,state:b.receiverState,country:'India',phone:String(b.receiverMobile),payment_mode:'Prepaid',cod_amount:0,total_amount:b.valueOfGoods,products_desc:p.contains,quantity:1,weight:Math.ceil(p.weight*1000),shipment_length:p.length,shipment_width:p.width,shipment_height:p.height,shipping_mode:b.provider.courierId==='E'?'Express':'Surface',seller_name:b.senderName,seller_add:b.senderAddress,seller_inv:invoice,seller_gst_tin:connection.sellerGst,hsn_code:b.hsCode,...(b.goodsEwaybill?{ewbn:b.goodsEwaybill}:{})}]};
}
export async function placeDelhiveryOrder(connection,b,origin){
  const payload=delhiveryPayload(connection,b,origin);
  const form=new URLSearchParams({format:'json',data:JSON.stringify(payload)}).toString();
  const result=await delhiveryRequest(connection,'POST','/api/cmu/create.json',{data:form,form:true});
  const parcel=result.packages?.find(p=>String(p.waybill)===String(b.provider.awb));
  if(result.success===true&&parcel&&String(parcel.status).toLowerCase()==='success')return {orderId:delhiveryReference(b),shipmentId:b.provider.awb,awb:b.provider.awb};
  throw new ApiError(502,'Delhivery confirmation needs reconciliation. Do not create another shipment.');
}
export function ensureDelhiveryEnvironment(connection,b){if(b.provider.environment&&b.provider.environment!==connection.environment)throw new ApiError(409,'Reconnect the Delhivery environment used for this shipment before updating it');}
export async function delhiveryTracking(connection,b){
  ensureDelhiveryEnvironment(connection,b);if(!/^\d{8,30}$/.test(b.provider.awb||''))throw new ApiError(409,'No Delhivery AWB is saved');
  const result=await delhiveryRequest(connection,'GET','/api/v1/packages/json/',{params:{waybill:b.provider.awb}});
  const shipment=result.ShipmentData?.map(row=>row.Shipment).find(row=>String(row.AWB)===String(b.provider.awb));
  if(!shipment)return null;
  // When supplied, validate the provider's reference against this company booking.
  if(shipment.ReferenceNo&&String(shipment.ReferenceNo)!==delhiveryReference(b))throw new ApiError(409,'Delhivery reference does not match this company shipment');
  return shipment;
}
export function delhiveryTrackingState(shipment,{cancellationRequested=false}={}){
  const scans=(shipment.Scans||[]).map(row=>row.ScanDetail||row);
  const status=String(shipment.Status?.Status||''),type=String(shipment.Status?.StatusType||'');
  // PickupDate is affirmative evidence. No unknown status is treated as safe to cancel.
  const returned=/^returned$/i.test(status);
  const picked=!!shipment.PickedupDate||['RT','RTO','DL'].includes(type)||scans.some(s=>/picked up|in transit|dispatched|out for delivery|delivered/i.test(s.Scan||s.Instructions||''))||returned&&!cancellationRequested;
  const manifested=/^(manifested|not picked|scheduled|open)$/i.test(status);
  const delivered=/^delivered$/i.test(status)&&!['RT','RTO'].includes(type);
  const cancelled=/^cancelled$/i.test(status)||returned&&cancellationRequested&&!picked;
  return {status:status||'Tracking pending',picked:picked||delivered||(!manifested&&!cancelled),delivered,cancelled,events:scans.slice(-80).map(s=>({at:Number.isFinite(Date.parse(s.ScanDateTime))?new Date(s.ScanDateTime):new Date(),status:String(s.Scan||''),location:String(s.ScannedLocation||''),description:String(s.Instructions||'')}))};
}
export async function cancelDelhiveryOrder(connection,b){ensureDelhiveryEnvironment(connection,b);return delhiveryRequest(connection,'POST','/api/p/edit',{data:{waybill:b.provider.awb,cancellation:'true'}});}
export async function delhiveryPackingSlip(connection,b){ensureDelhiveryEnvironment(connection,b);return delhiveryRequest(connection,'GET','/api/p/packing_slip',{params:{wbns:b.provider.awb}});}
export async function requestDelhiveryPickup(connection,b,input){
  ensureDelhiveryEnvironment(connection,b);
  const date=text(input.date,'pickup date YYYY-MM-DD',10),time=text(input.time,'pickup time HH:mm:ss',8);
  const timestamp=new Date(date+'T'+time+'+05:30');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)||!Number.isFinite(timestamp.getTime())||new Date(timestamp.getTime()+330*60000).toISOString().slice(0,10)!==date||timestamp<=new Date())throw new ApiError(400,'Choose a valid future pickup date and time');
  return delhiveryRequest(connection,'POST','/fm/request/new/',{data:{pickup_date:date,pickup_time:time,pickup_location:b.provider.pickupLocation,expected_package_count:1}});
}
