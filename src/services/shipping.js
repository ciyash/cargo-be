import { createHash } from 'node:crypto';
import { phoneNumber } from '../utils/phone.js';
import { calculateBooking, money } from './booking-calculation.js';
import { reverseStatementBooking } from './voucher-workflow.js';
import Branch from '../models/branch.model.js';
import { Booking, Delivery } from '../models/booking.model.js';
import { ApiError } from '../utils/api-error.js';
import { isManager } from "../middleware/workspace.auth.js";
import { nextSequence } from './sequence.js';
import { transaction, changeQuota } from './quota.js';
import { courierConnection } from './couriers.js';
import { delhiveryQuotes, delhiveryPayload, fetchDelhiveryWaybill, placeDelhiveryOrder, delhiveryTracking, delhiveryTrackingState, cancelDelhiveryOrder } from './delhivery.js';

export function shipmentScope(user){return {companyId:user.companyId,...(!isManager(user)?{$or:[{pickUpBranch:user.branchId||'__unassigned__'},{dropBranch:user.branchId||'__unassigned__'},{unloadingBranch:user.branchId||'__unassigned__'}]}:{})};}
export function requiredText(value,label,max=200){if(typeof value!=='string'||!value.trim()||value.length>max)throw new ApiError(400,`Provide a valid ${label}`);return value.trim();}
export function amount(value,label){return money(value,label);}
export function normalizeShipment(body){
  const data={category:body.category||'domestic',originId:requiredText(body.originId,'origin branch',30),destinationCountry:requiredText(body.destinationCountry,'destination country',80),destinationPostalCode:requiredText(body.destinationPostalCode,'postal code',20),toCity:requiredText(body.toCity,'destination city',100)};
  if(!['domestic','international'].includes(data.category))throw new ApiError(400,'Invalid shipment category');
  if(!Array.isArray(body.packages)||!body.packages.length||body.packages.length>50)throw new ApiError(400,'Provide 1–50 packages');
  data.packages=body.packages.map(p=>{const quantity=Number(p.quantity),weight=Number(p.weight);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000||!Number.isFinite(weight)||weight<=0||weight>1000)throw new ApiError(400,'Packages need positive quantities and weights');const dimensions={};for(const k of ['length','width','height']){const n=Number(p[k]);if(!Number.isFinite(n)||n<=0||n>1000)throw new ApiError(400,'Provide positive package dimensions');dimensions[k]=n;}const unitPrice=amount(p.unitPrice,'package freight');return {quantity,weight,...dimensions,packageType:requiredText(p.packageType,'package type',80),contains:requiredText(p.contains,'contents',150),unitPrice,totalPrice:Math.round(quantity*unitPrice*100)/100};});
  for(const k of ['senderName','receiverName','senderAddress','receiverAddress'])data[k]=requiredText(body[k],k,500);
  for(const k of ['senderMobile','receiverMobile'])data[k]=phoneNumber(body[k],k,data.category==='international');
  data.receiverState=requiredText(body.receiverState,'receiver state / region',100);data.receiverEmail=String(body.receiverEmail||'').trim();
  data.bookingType=body.bookingType||'paid';if(!['paid','toPay','credit','FOC'].includes(data.bookingType))throw new ApiError(400,'Invalid freight type');
  data.agent=data.bookingType==='credit'?requiredText(body.agent,'credit party',150):'';
  data.valueOfGoods=amount(body.valueOfGoods,'goods value');
  for(const k of ['serviceCharges','hamaliCharges','doorDeliveryCharges','doorPickupCharges','parcelGstAmount'])data[k]=amount(body[k]??0,k);
  Object.assign(data,calculateBooking(data));
  data.remarks=String(body.remarks||'').slice(0,1000);
  for(const field of ['hsCode','shippingInvoice','goodsEwaybill'])data[field]=String(body[field]||'').trim().slice(0,100);
  if(data.category==='international'){
    const source=body.international||{};if(!/^\d{6,10}$/.test(source.hsCode||''))throw new ApiError(400,'Provide an international HS code');
    if(!Array.isArray(source.documents)||source.documents.length<1||source.documents.length>3)throw new ApiError(400,'Attach international invoice/identity documents (up to 3)');
    const documents=source.documents.map(d=>{const name=requiredText(d.name,'document filename',120),buffer=Buffer.from(String(d.data||''),'base64');const pdf=buffer.subarray(0,5).toString()==='%PDF-',png=buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=buffer[0]===255&&buffer[1]===216&&buffer[2]===255;if(!buffer.length||buffer.length>3*1024*1024||!pdf&&!png&&!jpg)throw new ApiError(400,'Documents must be PDF, PNG or JPEG up to 3 MB');return {name,mime:pdf?'application/pdf':png?'image/png':'image/jpeg',data:buffer.toString('base64')};});
    if(!['Sender','Recipient'].includes(source.duties))throw new ApiError(400,'Choose duties responsibility');
    data.international={purpose:requiredText(source.purpose,'shipment purpose'),invoice:requiredText(source.invoice,'invoice reference'),hsCode:source.hsCode,duties:source.duties,currency:source.currency||'INR',documents};
  }
  return data;
}
export async function shipmentRoute(company,user,input){
  const origin=await Branch.findOne({_id:input.originId,companyId:user.companyId}).lean();
  if(!origin)throw new ApiError(404,'Origin branch not found');
  if(!isManager(user)&&origin.branchUniqueId!==user.branchId)throw new ApiError(403,'Use your assigned booking branch');
  if(company.operatingCategories&&company.operatingCategories!=='both'&&company.operatingCategories!==input.category)throw new ApiError(403,'Shipment category not enabled by the company');
  const originCountry=origin.country||'India';
  if(input.category==='domestic'&&(originCountry.toLowerCase()!=='india'||input.destinationCountry.toLowerCase()!=='india'))throw new ApiError(400,'Domestic shipments must be within India');
  if(input.category==='international'&&originCountry.toLowerCase()===input.destinationCountry.toLowerCase())throw new ApiError(400,'International shipments need different origin and destination countries');
  const branches=await Branch.find({companyId:user.companyId,country:input.destinationCountry}).lean();
  const postal=input.destinationPostalCode.replace(/\s/g,'').toUpperCase();
  const destination=branches.find(b=>String(b._id)!==String(origin._id)&&b.city.trim().toLowerCase()===input.toCity.trim().toLowerCase()&&(b.servicePostalCodes?.length?b.servicePostalCodes.map(s=>s.replace(/\s/g,'').toUpperCase()).includes(postal):String(b.pincode)===postal));
  return {origin,destination:destination||null,own:!!destination,reason:destination?'Both ends are served by the company network.':'No complete own-network route; choose an enabled courier.'};
}
export async function shippingOptions(company,user,body){
  const input=normalizeShipment(body),route=await shipmentRoute(company,user,input);
  if(route.own)return {route,quotes:[{providerKey:'own',name:company.name,amount:input.grandTotal,currency:'INR'}],input};
  if(input.category==='international')return {route,quotes:[],input,message:'No own international route is available. The connected Delhivery adapter currently supports domestic India only.'};
  const connection=await courierConnection(user.companyId,'delhivery').catch(error=>{if(error.status===403)return null;throw error;});
  if(!connection)return {route,quotes:[],input,message:'Company Admin must connect Delhivery and enable the company service in Courier Services.'};
  return {route,quotes:await delhiveryQuotes(connection,input,route.origin),input};
}
export async function createShipment(company,user,body,key){
  if(typeof key!=='string'||!/^[-\w]{8,100}$/.test(key))throw new ApiError(400,'A valid Idempotency-Key is required');
  const hash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const existing=await Booking.findOne({companyId:user.companyId,requestKey:key});
  if(existing){if(!isManager(user)&&existing.pickUpBranch!==user.branchId)throw new ApiError(403,'This booking belongs to another origin branch');if(existing.requestHash!==hash)throw new ApiError(409,'Request key already belongs to different booking details');return existing;}
  const {route,quotes,input}=await shippingOptions(company,user,body);
  const selected=quotes.find(q=>q.providerKey===body.providerKey&&(q.providerKey==='own'||q.courierId===String(body.courierId)));
  if(!selected)throw new ApiError(409,'Selected service is unavailable; check coverage and rates again');
  if(body.expectedAmount!=null&&(!Number.isFinite(Number(body.expectedAmount))||Math.abs(Number(body.expectedAmount)-selected.amount)>.01))throw new ApiError(409,'Quote changed. Review the updated rate before booking');
  if(!route.own&&input.bookingType!=='paid')throw new ApiError(400,'External bookings currently support prepaid freight only');
  const last=await Booking.findOne({companyId:user.companyId}).sort({grnNo:-1}).select('grnNo').lean();
  const grnNo=await nextSequence(`grn:${user.companyId}`,last?.grnNo||999);
  const data={...input,companyId:user.companyId,requestKey:key,requestHash:hash,grnNo,lrNumber:`${company.name.slice(0,2).toUpperCase()}/${grnNo}`,adminUniqueId:user.subadminUniqueId||0,bookedBy:user.id||undefined,bookedByCompany:user.accountType==='company'||user.role==='company'?user.companyId:undefined,bookbranchid:route.origin._id,pickUpBranch:route.origin.branchUniqueId,pickUpBranchname:route.origin.name,dropBranch:route.destination?.branchUniqueId||'EXTERNAL',dropBranchname:route.destination?.name||selected.name,fromCity:route.origin.city,location:route.origin.location,pickupCountry:route.origin.country,pickupPostalCode:String(route.origin.pincode),totalPackages:input.packages.length,totalQuantity:input.packages.reduce((n,p)=>n+p.quantity,0),totalCharge:input.packages.reduce((n,p)=>n+p.totalPrice,0),grandTotal:route.own?input.grandTotal:selected.amount,fulfilment:route.own?'own':'external',confirmationStatus:route.own?'confirmed':'pending',shipmentStage:route.own?'Booked':'Confirmation pending',bookingStatus:0,provider:route.own?undefined:{key:selected.providerKey,courierId:selected.courierId,courierName:selected.name},trackingEvents:[{at:new Date(),status:route.own?'Booked':'Confirmation pending',description:'Created by '+(user.name||company.name)}]};
  const connection=route.own?null:await courierConnection(user.companyId,'delhivery');
  if(!route.own){
    delhiveryPayload(connection,{...data,provider:{...data.provider,awb:'preflight'}},route.origin);
    Object.assign(data.provider,{awb:await fetchDelhiveryWaybill(connection),environment:connection.environment,pickupLocation:route.origin.delhiveryPickupLocation,quotedAmount:selected.amount,quoteIsEstimate:true,quotedWeightGrams:selected.weightGrams,quotedAt:new Date()});
  }
  const booking=await transaction(async session=>{const b=new Booking(data);await changeQuota(b,route.own?'consume':'reserve',session,user.id||'company');await b.save({session});return b;});
  if(route.own)return booking;
  try{const result=await placeDelhiveryOrder(connection,booking,route.origin);await settleExternal(user,booking._id,result);return Booking.findById(booking._id);}
  catch(error){if(error.definitive)await settleExternal(user,booking._id,null,true);await Booking.updateOne({_id:booking._id,companyId:user.companyId},{$set:{'provider.error':error.message}});return Booking.findById(booking._id);}
}
export async function settleExternal(user,id,provider,failed=false){return transaction(async session=>{const b=await Booking.findOne({_id:id,...shipmentScope(user)}).session(session);if(!b)throw new ApiError(404,'Shipment not found');if(b.confirmationStatus!=='pending'||b.provider?.cancelPending)return b;await changeQuota(b,failed?'release':'consume',session,user.id||'company');if(provider)Object.assign(b.provider,provider);b.confirmationStatus=failed?'failed':'confirmed';b.shipmentStage=failed?'Booking failed':'Booked';await b.save({session,validateModifiedOnly:true});return b;});}
export async function reconcileExternal(user,id){
  let b=await Booking.findOne({_id:id,...shipmentScope(user)});
  if(!b||b.fulfilment!=='external')throw new ApiError(404,'External shipment not found');
  const connection=await courierConnection(user.companyId,b.provider.key);
  return syncDelhiveryTracking(user,b,connection);
}
export async function syncTracking(user,id){return reconcileExternal(user,id);}
export async function cancelShipment(user,identifier){
  let b=await Booking.findOne({...identifier,...shipmentScope(user)});if(!b)throw new ApiError(404,'Shipment not found');if(b.bookingStatus===5)return b;
  if(!isManager(user)&&b.pickUpBranch!==user.branchId)throw new ApiError(403,'Only the booking branch can cancel this shipment');
  if(b.fulfilment==='external'){
    if(b.provider?.key!=='delhivery')throw new ApiError(422,'Only Delhivery is supported for external shipments');
    return cancelDelhiveryShipment(user,b);
  }
  return transaction(async session=>{
    const current=await Booking.findOne({_id:b._id,...shipmentScope(user)}).session(session);
    if(!current)throw new ApiError(404,'Shipment not found');
    if(current.bookingStatus===5)return current;
    if(current.bookingStatus!==0||current.loadingDate||current.provider?.pickedUp)throw new ApiError(409,'Loading / pickup started. Cancellation is locked');
    await reverseStatementBooking(current,session);
    await changeQuota(current,current.quotaStatus==='held'?'release':'restore',session,user.id||'company');
    Object.assign(current,{bookingStatus:5,refundAmount:current.bookingType==='paid'?current.grandTotal:0,cancelDate:new Date(),cancelByUser:user.name||'Company',cancelBranch:current.pickUpBranch,cancelCity:current.fromCity,confirmationStatus:'cancelled',shipmentStage:'Cancelled'});
    if(current.provider)current.provider.cancelPending=false;
    await current.save({session,validateModifiedOnly:true});
    return current;
  });
}
export async function syncDelhiveryTracking(user,booking,connection){
  if(booking.confirmationStatus==='failed'||booking.bookingStatus===5)return booking;
  const shipment=await delhiveryTracking(connection,booking);
  if(!shipment)throw new ApiError(409,'Delhivery has not confirmed this AWB yet. Keep this booking and check again; do not create a duplicate.');
  return transaction(async session=>{
    const b=await Booking.findOne({_id:booking._id,...shipmentScope(user)}).session(session);
    if(!b)throw new ApiError(404,'Shipment not found');
    if(b.bookingStatus===5)return b;
    const state=delhiveryTrackingState(shipment,{cancellationRequested:!!b.provider.cancelPending});
    const picked=!!b.provider.pickedUp||state.picked;
    if(state.cancelled&&!picked){
      await changeQuota(b,b.quotaStatus==='held'?'release':'restore',session,user.id||'company');
      Object.assign(b,{bookingStatus:5,confirmationStatus:'cancelled',shipmentStage:'Cancelled',cancelDate:new Date(),refundAmount:b.bookingType==='paid'?b.grandTotal:0,cancelBranch:b.pickUpBranch,cancelCity:b.fromCity,cancelByUser:user.name||'Delhivery'});b.provider.cancelPending=false;
    }else{
      if(b.confirmationStatus==='pending'){await changeQuota(b,'consume',session,user.id||'company');b.confirmationStatus='confirmed';b.provider.orderId=`${b.companyId}-${b.grnNo}`;b.provider.shipmentId=b.provider.awb;}
      if(b.bookingStatus!==4){b.shipmentStage=state.status;if(state.delivered){b.bookingStatus=4;b.deliveryDate=new Date();}else if(picked)b.bookingStatus=1;}
    }
    Object.assign(b.provider,{pickedUp:picked,status:state.status,lastSyncedAt:new Date(),error:''});
    if(state.events.length)b.trackingEvents=state.events;
    await b.save({session,validateModifiedOnly:true});return b;
  });
}
async function cancelDelhiveryShipment(user,booking){
  const connection=await courierConnection(user.companyId,'delhivery');
  // Fetch current carrier scans before attempting cancellation, even if the UI is stale.
  const b=await syncDelhiveryTracking(user,booking,connection);
  if(b.bookingStatus===5)return b;
  if(b.provider.pickedUp||b.bookingStatus!==0||b.confirmationStatus!=='confirmed')throw new ApiError(409,'Delhivery pickup/movement has started or confirmation is pending; cancellation is locked');
  if(!b.provider.cancelPending){
    const lock=await Booking.updateOne({_id:b._id,companyId:user.companyId,bookingStatus:0,'provider.pickedUp':{$ne:true},'provider.cancelPending':{$ne:true}},{$set:{'provider.cancelPending':true}});
    if(lock.matchedCount!==1)throw new ApiError(409,'Shipment changed; refresh before cancelling');
    try{await cancelDelhiveryOrder(connection,b);}catch(error){if(error.definitive)await Booking.updateOne({_id:b._id,companyId:user.companyId},{$set:{'provider.cancelPending':false}});throw error;}
  }
  const current=await Booking.findOne({_id:b._id,...shipmentScope(user)});
  return syncDelhiveryTracking(user,current,connection);
}
export async function ownOperation(user,id,input){return transaction(async session=>{const b=await Booking.findOne({_id:id,...shipmentScope(user)}).session(session);if(!b||b.fulfilment!=='own')throw new ApiError(404,'Own shipment not found');if(b.confirmationStatus!=='confirmed'||b.bookingStatus===5)throw new ApiError(409,'Shipment is not active');const action=input.action;
  const origin=['load','dispatch'].includes(action);if(!isManager(user)&&(origin?b.pickUpBranch:b.dropBranch)!==user.branchId)throw new ApiError(403,'This operation belongs to another branch');
  if(action==='load'){if(b.bookingStatus!==0)throw new ApiError(409,'Only booked parcels can load');b.vehicalNumber=requiredText(input.vehicle,'vehicle');b.driverName=requiredText(input.driver,'driver');b.bookingStatus=1;b.loadingDate=new Date();b.shipmentStage='Loaded';}
  else if(action==='dispatch'){if(b.bookingStatus!==1||b.shipmentStage==='In transit')throw new ApiError(409,'Load the parcel before dispatch');b.shipmentStage='In transit';}
  else if(action==='unload'){if(b.bookingStatus!==1)throw new ApiError(409,'Only loaded/dispatched parcels can unload');b.bookingStatus=2;b.unloadingDate=new Date();b.unloadingBranch=b.dropBranch;b.shipmentStage='Unloaded';}
  else if(action==='deliver'){if(b.bookingStatus!==2)throw new ApiError(409,'Unload before delivery');const received=amount(input.amount,'delivery collection');if(b.bookingType==='toPay'&&Math.abs(received-b.grandTotal)>.01)throw new ApiError(400,'Collect the full To Pay freight before delivery');if(b.bookingType!=='toPay'&&received!==0)throw new ApiError(400,'Only To Pay freight can be collected at delivery');const receiver=requiredText(input.receiver,'receiver'),mobile=phoneNumber(input.phone,'Receiver phone',b.category==='international');await Delivery.create([{companyId:b.companyId,bookingId:b._id,grnNo:b.grnNo,receiverName:receiver,receiverMobile:mobile,toPayDeliveredAmount:received,bookingType:b.bookingType,deliveryDate:new Date(),deliveryCity:b.toCity,deliveryBranch:b.dropBranch,deliveryBranchName:b.dropBranchname,deliveryEmployee:user.name||'Company'}],{session});b.bookingStatus=4;b.deliveryDate=new Date();b.deliveryBranch=b.dropBranch;b.deliveryBranchName=b.dropBranchname;b.deliveryCity=b.toCity;b.toPayDeliveredAmount=received;b.shipmentStage='Delivered';}
  else throw new ApiError(400,'Unknown operation');
  b.trackingEvents.push({at:new Date(),status:b.shipmentStage,description:user.name||'Company operation'});await b.save({session,validateModifiedOnly:true});return b;
});}
