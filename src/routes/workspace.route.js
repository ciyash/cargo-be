import express from 'express';
import { domesticPhoneFields } from '../utils/phone.js';
import mongoose from 'mongoose';
import { timingSafeEqual } from 'node:crypto';
import Company from '../models/company.model.js';
import Branch from '../models/branch.model.js';
import Staff from '../models/admin.auth.model.js';
import Payment from '../models/payment.model.js';
import { Booking } from '../models/booking.model.js';
import { QuotaEvent, CourierConnection } from '../models/logistics.model.js';
import { workspaceAuth, requireManager, isManager } from "../middleware/workspace.auth.js";
import branchController from '../controllers/branch.controller.js';
import staffController from '../controllers/admin.auth.controller.js';
import { ApiError } from '../utils/api-error.js';
import { reportDayStart, reportDayEnd } from '../utils/report-input.js';
import { billingStatus } from '../services/billing.js';
import { allocateFranchise } from '../services/quota.js';
import { providerCatalog, courierConnection } from '../services/couriers.js';
import { shippingOptions, createShipment, shipmentScope, cancelShipment, reconcileExternal, syncTracking, ownOperation } from '../services/shipping.js';
import { normalizeRole, roleLabel, permissionsFor, hasPermission, hasAnyPermission, WORK_PERMISSIONS, ROLE_LABELS } from '../services/roles.js';
import { updateStaffAccess } from '../services/staff-access.js';
import { City } from '../models/multi.model.js';
import { connectDelhivery, requestDelhiveryPickup, delhiveryPackingSlip } from '../services/delhivery.js';
import { delhiveryLabel } from '../services/delhivery-label.js';
const router=express.Router();
router.use('/staff',domesticPhoneFields);
const handle=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const cleanBooking=b=>{const json=b.toObject?b.toObject():b;for(const d of json.international?.documents||[])delete d.data;return json;};
export const carrierWebhook=handle(async(req,res)=>{
  const secret=process.env.CARRIER_WEBHOOK_SECRET,provided=req.get('x-api-key');
  if(!secret||secret.length<32)throw new ApiError(503,'Carrier webhook is not configured');
  if(typeof provided!=='string'||Buffer.byteLength(provided)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(provided),Buffer.from(secret)))throw new ApiError(401,'Invalid webhook token');
  const companyId=req.params.companyId,awb=req.body.awb;
  if(!mongoose.isValidObjectId(companyId)||typeof awb!=='string'||awb.length>100)throw new ApiError(400,'Invalid webhook identifiers');
  const b=await Booking.findOne({companyId,'provider.key':'delhivery','provider.awb':awb}).select('_id');
  if(b)await syncTracking({companyId,role:'company'},b._id);
  res.status(200).json({received:true});
});
router.use(workspaceAuth);
router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.use((req,res,next)=>{
  const p=req.path,u=req.user;let allowed=true;
  if(p==='/staff'||p.startsWith('/staff/'))allowed=hasPermission(u,'team');
  else if(p==='/options'||p==='/bookings'&&req.method==='POST'||/\/(cancel|reconcile)$/.test(p))allowed=hasPermission(u,'bookings');
  else if(/\/operation$/.test(p))allowed=hasPermission(u,['unload','deliver'].includes(req.body.action)?'delivery':'loading');
  else if(/\/(pickup|label)$/.test(p))allowed=hasAnyPermission(u,'bookings','loading');
  else if(p==='/quota-ledger'||p==='/allocations')allowed=hasAnyPermission(u,'reports','team');
  else if(p.startsWith('/bookings'))allowed=hasAnyPermission(u,...WORK_PERMISSIONS);
  if(!allowed)return next(new ApiError(403,'Your account does not have permission for this action'));
  next();
});
router.get('/context',handle(async(req,res)=>{
  const [branches,status,connections,cities]=await Promise.all([Branch.find({companyId:req.user.companyId}).lean(),billingStatus(req.user.companyId,req.user.branchId),CourierConnection.find({companyId:req.user.companyId}).lean(),City.find({companyId:req.user.companyId}).sort({cityName:1}).lean()]);
  res.json({company:{_id:req.company._id,name:req.company.name,logoText:req.company.logoText,operatingCategories:req.company.operatingCategories||'both'},user:{role:normalizeRole(req.user.role),roleLabel:roleLabel(req.user.role),permissions:permissionsFor(req.user),name:req.user.name,branchId:req.user.branchId,branchObjectId:req.user.branchObjectId},canManage:isManager(req.user),canManageTeam:hasPermission(req.user,'team'),canPay:isManager(req.user),roles:Object.entries(ROLE_LABELS).filter(([key])=>isManager(req.user)||key==='staff').map(([value,label])=>({value,label})),quota:status,cities,branches:branches.map(b=>{if(!isManager(req.user)&&b.branchUniqueId!==req.user.branchId)delete b.franchiseQuota;return b;}),services:providerCatalog().map(p=>({...p,connection:connections.find(c=>c.providerKey===p.key)||null}))});
}));
router.patch('/company',requireManager,handle(async(req,res)=>{const updates={};if(req.body.operatingCategories!==undefined){if(!['domestic','international','both'].includes(req.body.operatingCategories))throw new ApiError(400,'Invalid company categories');updates.operatingCategories=req.body.operatingCategories;}if(req.body.name!==undefined){if(typeof req.body.name!=='string'||!req.body.name.trim()||req.body.name.length>150)throw new ApiError(400,'Company name required');updates.name=req.body.name.trim();}res.json(await Company.findOneAndUpdate({_id:req.user.companyId},{$set:updates},{new:true,runValidators:true}).select('name logoText operatingCategories'));}));
router.post('/branches',requireManager,branchController.createBranch);
router.post('/branches/:id/allowance',requireManager,handle(async(req,res)=>res.status(201).json(await allocateFranchise(req.user.companyId,req.params.id,req.body,req.user.id||'company'))));
router.get('/allocations',handle(async(req,res)=>res.json(await QuotaEvent.find({companyId:req.user.companyId,kind:'allocate',...(!isManager(req.user)?{branchId:req.user.branchObjectId||null}:{})}).sort({createdAt:-1}).limit(200).lean())));
router.get('/staff',handle(async(req,res)=>{const rows=await Staff.find({companyId:req.user.companyId,...(!isManager(req.user)?{branchId:req.user.branchObjectId,role:'staff'}:{})}).select('-password -otp -otpExpires').populate('branchId','name branchUniqueId').limit(500).lean();res.json(rows.map(row=>({...row,role:normalizeRole(row.role),roleLabel:roleLabel(row.role),permissions:permissionsFor(row)})));}));
router.post('/staff',staffController.signup);
router.patch('/staff/:id/access',handle(async(req,res)=>res.json(await updateStaffAccess(req.user,req.params.id,req.body))));
router.post('/services/:key/connect',requireManager,handle(async(req,res)=>{if(req.params.key!=='delhivery')throw new ApiError(422,'Only Delhivery is available for new connections');res.json(await connectDelhivery(req.user.companyId,req.body));}));
router.patch('/branches/:id/courier',requireManager,handle(async(req,res)=>{
  const name=req.body.delhiveryPickupLocation;
  if(typeof name!=='string'||!name.trim()||name.trim().length>150)throw new ApiError(400,'Enter the exact registered Delhivery warehouse name');
  const branch=await Branch.findOneAndUpdate({_id:req.params.id,companyId:req.user.companyId},{$set:{delhiveryPickupLocation:name.trim()}},{new:true,runValidators:true}).select('name city pincode delhiveryPickupLocation');
  if(!branch)throw new ApiError(404,'Branch not found');res.json(branch);
}));
router.post('/services/:key/disconnect',requireManager,handle(async(req,res)=>{await CourierConnection.updateOne({companyId:req.user.companyId,providerKey:req.params.key},{$set:{connected:false},$unset:{token:1,credentials:1}});res.json({connected:false});}));
router.post('/options',handle(async(req,res)=>{const options=await shippingOptions(req.company,req.user,req.body);delete options.input;res.json(options);}));
router.post('/bookings',handle(async(req,res)=>{const b=await createShipment(req.company,req.user,req.body,req.get('Idempotency-Key'));res.status(b.confirmationStatus==='pending'?202:201).json(cleanBooking(b));}));
router.get('/bookings',handle(async(req,res)=>{
  const page=Number(req.query.page||1),limit=Number(req.query.limit||25);
  if(!Number.isSafeInteger(page)||page<1||page>1000000||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new ApiError(400,'Invalid page or limit');
  const filter=shipmentScope(req.user);
  if(req.query.category){if(!['domestic','international'].includes(req.query.category))throw new ApiError(400,'Invalid category');filter.category=req.query.category;}
  if(req.query.fulfilment){if(!['own','external'].includes(req.query.fulfilment))throw new ApiError(400,'Invalid fulfilment');filter.fulfilment=req.query.fulfilment;}
  if(req.query.provider){if(req.query.provider!=='delhivery')throw new ApiError(400,'Invalid courier filter');filter['provider.key']='delhivery';}
  if(req.query.status!==undefined){const status=Number(req.query.status);if(!Number.isInteger(status)||status<0||status>5)throw new ApiError(400,'Invalid status');filter.bookingStatus=status;}
  if(req.query.branch){if(!isManager(req.user))throw new ApiError(403,'Company access required');filter.pickUpBranch=String(req.query.branch);}
  if(req.query.from||req.query.to){const start=req.query.from?reportDayStart(req.query.from):null,end=req.query.to?reportDayEnd(req.query.to):null;if(start&&end&&start>end)throw new ApiError(400,'Invalid date range');filter.bookingDate={...(start?{$gte:start}:{}),...(end?{$lte:end}:{})};}
  if(req.query.search){const search=String(req.query.search).slice(0,100),escaped=search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');filter.$and=[{$or:[{lrNumber:{$regex:escaped,$options:'i'}},{'provider.awb':search},{senderName:{$regex:escaped,$options:'i'}},{receiverName:{$regex:escaped,$options:'i'}},...(Number.isSafeInteger(+search)?[{grnNo:+search}]:[])]}];}
  const cast=Booking.find(filter).cast(Booking);
  const [rows,summary]=await Promise.all([Booking.find(filter).select('-international.documents.data').sort({bookingDate:-1,_id:-1}).skip((page-1)*limit).limit(limit).lean(),Booking.aggregate([{$match:cast},{$group:{_id:null,total:{$sum:1},freight:{$sum:{$cond:[{$and:[{$eq:[{$ifNull:['$confirmationStatus','confirmed']},'confirmed']},{$ne:['$bookingStatus',5]}]},'$grandTotal',0]}},delivered:{$sum:{$cond:[{$eq:['$bookingStatus',4]},1,0]}},pending:{$sum:{$cond:[{$eq:['$confirmationStatus','pending']},1,0]}}}}])]);
  const totals=summary[0]||{total:0,freight:0,delivered:0,pending:0};res.json({rows,totals,pagination:{page,limit,total:totals.total,pages:Math.ceil(totals.total/limit)}});
}));
router.get('/bookings/:id',handle(async(req,res)=>{const b=await Booking.findOne({_id:req.params.id,...shipmentScope(req.user)}).select('-international.documents.data');if(!b)throw new ApiError(404,'Shipment not found');res.json(b);}));
router.post('/bookings/:id/reconcile',handle(async(req,res)=>res.json(cleanBooking(await reconcileExternal(req.user,req.params.id)))));
router.post('/bookings/:id/tracking',handle(async(req,res)=>res.json(cleanBooking(await syncTracking(req.user,req.params.id)))));
router.post('/bookings/:id/cancel',handle(async(req,res)=>res.json(cleanBooking(await cancelShipment(req.user,{_id:req.params.id})))));
router.post('/bookings/:id/operation',handle(async(req,res)=>res.json(cleanBooking(await ownOperation(req.user,req.params.id,req.body)))));
router.post('/bookings/:id/label',handle(async(req,res)=>{
  const b=await Booking.findOne({_id:req.params.id,...shipmentScope(req.user)});
  if(!b?.provider?.shipmentId||b.confirmationStatus!=='confirmed'||b.bookingStatus===5)throw new ApiError(409,'Active confirmed courier reference required');
  const c=await courierConnection(req.user.companyId,b.provider.key);
  if(b.provider.key==='delhivery'){const slip=await delhiveryPackingSlip(c,b);return res.json({html:delhiveryLabel(b,c,slip)});}
  throw new ApiError(422,'Only Delhivery labels are supported');
}));
router.post('/bookings/:id/pickup',handle(async(req,res)=>{
  const b=await Booking.findOne({_id:req.params.id,...shipmentScope(req.user)});
  if(!b||b.bookingStatus!==0||b.confirmationStatus!=='confirmed'||b.provider?.cancelPending||!b.provider?.awb)throw new ApiError(409,'Active confirmed AWB required');
  if(!isManager(req.user)&&b.pickUpBranch!==req.user.branchId)throw new ApiError(403,'Only the pickup branch may schedule collection');
  const c=await courierConnection(req.user.companyId,b.provider.key);
  if(b.provider.key!=='delhivery')throw new ApiError(422,'Only Delhivery pickups are supported');
  const lock=await Booking.updateOne({_id:b._id,companyId:req.user.companyId,bookingStatus:0,'provider.cancelPending':{$ne:true},'provider.pickupRequestedAt':null},{$set:{'provider.pickupRequestedAt':new Date()}});
  if(lock.matchedCount!==1)throw new ApiError(409,'Pickup is already requested or pending. Check Delhivery before scheduling again.');
  try{const result=await requestDelhiveryPickup(c,b,req.body);const pickupId=result.pickup_id;if(!pickupId)throw new ApiError(502,'Pickup response is pending; check Delhivery One before retrying');await Booking.updateOne({_id:b._id,companyId:req.user.companyId},{$set:{'provider.pickupRequestId':String(pickupId)}});res.json({pickupId});}
  catch(error){if(error.definitive||error.status===400||error.status===409)await Booking.updateOne({_id:b._id,companyId:req.user.companyId},{$unset:{'provider.pickupRequestedAt':1}});throw error;}
}));
router.get('/bookings/:id/documents/:documentId',handle(async(req,res)=>{const b=await Booking.findOne({_id:req.params.id,...shipmentScope(req.user)});const d=b?.international?.documents?.id(req.params.documentId);if(!d)throw new ApiError(404,'Document not found');res.set('Content-Disposition',`attachment; filename="${d.name.replace(/[^a-zA-Z0-9_.-]/g,'_')}"`);res.type(d.mime).send(Buffer.from(d.data,'base64'));}));
router.get('/quota-ledger',handle(async(req,res)=>res.json(await QuotaEvent.find({companyId:req.user.companyId,...(!isManager(req.user)?{branchId:req.user.branchObjectId||null}:{})}).sort({createdAt:-1,_id:-1}).limit(200).lean())));
router.get('/payments',requireManager,handle(async(req,res)=>res.json(await Payment.find({companyId:req.user.companyId}).select('purpose bookings providerKey amount status orderId paidAt createdAt').sort({createdAt:-1}).limit(100).lean())));
export default router;
