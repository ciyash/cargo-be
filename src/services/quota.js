import mongoose from 'mongoose';
import Company from '../models/company.model.js';
import Branch from '../models/branch.model.js';
import { QuotaEvent } from '../models/logistics.model.js';
import { ApiError } from '../utils/api-error.js';
export function quotaSummary(quota={},totalKey='purchased') {
  const total=Number(quota[totalKey]||0),used=Number(quota.used||0),held=Number(quota.held||0);
  return {total,used,held,remaining:total-used,available:Math.max(0,total-used-held)};
}
export async function transaction(work) {const session=await mongoose.startSession();try{return await session.withTransaction(()=>work(session));}finally{await session.endSession();}}
export async function quotaStatus(companyId,branchId) {
  const company=await Company.findById(companyId).select('bookingQuota isBlocked').lean();
  if(!company)throw new ApiError(404,'Company not found');
  const branch=branchId?await Branch.findOne({companyId,branchUniqueId:branchId}).select('ownershipType franchiseQuota name').lean():null;
  const companyQuota={...quotaSummary(company.bookingQuota),freeGranted:Number(company.bookingQuota?.freeGranted||0)},franchise=branch?.ownershipType==='franchise'?quotaSummary(branch.franchiseQuota,'allocated'):null;
  return {company:companyQuota,franchise,canBook:!company.isBlocked&&companyQuota.available>0&&(!franchise||franchise.available>0),blocked:!!company.isBlocked};
}
const capacity=(prefix,totalKey)=>({$gt:[{$ifNull:[`$${prefix}.${totalKey}`,0]},{$add:[{$ifNull:[`$${prefix}.used`,0]},{$ifNull:[`$${prefix}.held`,0]}]}]});
export async function changeQuota(booking,kind,session,actor='') {
  const from=booking.quotaStatus||'none';
  const transitions={reserve:['none','held'],consume:from==='held'?['held','consumed']:['none','consumed'],release:['held','released'],restore:['consumed','restored']};
  const transition=transitions[kind];if(!transition||from!==transition[0])return false;
  const branch=await Branch.findOne({_id:booking.bookbranchid,companyId:booking.companyId}).session(session).lean();
  if(!branch)throw new ApiError(400,'Booking branch does not belong to the company');
  const reserving=kind==='reserve'||kind==='consume'&&from==='none';
  const delta=kind==='reserve'?{held:1}:kind==='consume'?{used:1,...(from==='held'?{held:-1}:{})}:kind==='release'?{held:-1}:{used:-1};
  const increments=prefix=>Object.fromEntries([...Object.entries(delta).map(([key,value])=>[`${prefix}.${key}`,value]),[`${prefix}.revision`,1]]);
  const filter={_id:booking.companyId,...(reserving?{isBlocked:{$ne:true},$expr:capacity('bookingQuota','purchased')}:{})};
  if(delta.held===-1)filter['bookingQuota.held']={$gte:1};if(delta.used===-1)filter['bookingQuota.used']={$gte:1};
  const result=await Company.updateOne(filter,{$inc:increments('bookingQuota')},{session});
  if(result.matchedCount!==1)throw new ApiError(reserving?402:409,reserving?'Company booking quota exhausted. Purchase an additional booking pack.':'Quota changed; refresh and retry');
  if(branch.ownershipType==='franchise') {
    const branchFilter={_id:branch._id,companyId:booking.companyId,...(reserving?{$expr:capacity('franchiseQuota','allocated')}:{})};
    if(delta.held===-1)branchFilter['franchiseQuota.held']={$gte:1};if(delta.used===-1)branchFilter['franchiseQuota.used']={$gte:1};
    const updated=await Branch.updateOne(branchFilter,{$inc:increments('franchiseQuota')},{session});
    if(updated.matchedCount!==1)throw new ApiError(403,'Franchise allowance exhausted or changed. Contact your company admin.');
  }
  await QuotaEvent.create([{companyId:booking.companyId,branchId:branch._id,bookingId:booking._id,kind,count:1,actor,operationKey:`${booking._id}:${kind}`}],{session});
  booking.quotaStatus=transition[1];return true;
}
export async function allocateFranchise(companyId,branchId,input,actor) {
  const count=Number(input.bookings),amount=Number(input.amount||0),key=input.requestKey;
  if(!Number.isSafeInteger(count)||count<1||count>100000000||!Number.isFinite(amount)||amount<0||amount>1000000000||typeof key!=='string'||!/^[-\w]{8,100}$/.test(key))throw new ApiError(400,'Provide a positive booking allowance, non-negative reference amount and request key');
  return transaction(async session=>{
    const existing=await QuotaEvent.findOne({companyId,operationKey:`allocation:${key}`}).session(session);
    if(existing){if(String(existing.branchId)!==String(branchId)||existing.count!==count||existing.amount!==amount)throw new ApiError(409,'Request key already used for another allowance');return existing;}
    const company=await Company.findById(companyId).select('bookingQuota isBlocked').session(session).lean();
    if(!company)throw new ApiError(404,'Company not found');
    if(company.isBlocked)throw new ApiError(403,'Company is blocked');
    const franchises=await Branch.find({companyId,ownershipType:'franchise'}).select('franchiseQuota').session(session).lean();
    const available=quotaSummary(company.bookingQuota).available;
    const outstanding=franchises.reduce((sum,branch)=>sum+quotaSummary(branch.franchiseQuota,'allocated').available,0);
    const allocatable=Math.max(0,available-outstanding);
    if(count>allocatable)throw new ApiError(409,`Your company has ${available} available bookings; ${outstanding} are already allocated to franchises. You can allocate ${allocatable} more bookings. Purchase an additional booking pack to allocate ${count}.`);
    // Serialize allocations with bookings and purchases without consuming booking quota.
    const locked=await Company.updateOne({_id:companyId},{$inc:{'bookingQuota.revision':1}},{session});
    if(locked.matchedCount!==1)throw new ApiError(409,'Company quota changed; refresh and retry');
    const result=await Branch.updateOne({_id:branchId,companyId,ownershipType:'franchise'},{$inc:{'franchiseQuota.allocated':count,'franchiseQuota.revision':1}},{session});
    if(result.matchedCount!==1)throw new ApiError(404,'Franchise branch not found');
    const [entry]=await QuotaEvent.create([{companyId,branchId,kind:'allocate',count,amount,reference:String(input.note||'').slice(0,500),actor,operationKey:`allocation:${key}`}],{session});return entry;
  });
}
