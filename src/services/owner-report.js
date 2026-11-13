import Company from '../models/company.model.js';
import Branch from '../models/branch.model.js';
import Payment from '../models/payment.model.js';
import { Booking } from '../models/booking.model.js';
import { CourierConnection } from '../models/logistics.model.js';
import { ApiError, escapeRegex } from '../utils/api-error.js';
import { quotaSummary } from './quota.js';

const available = {$max:[0,{$subtract:[{$ifNull:['$bookingQuota.purchased',0]},{$add:[{$ifNull:['$bookingQuota.used',0]},{$ifNull:['$bookingQuota.held',0]}]}]}]};
export function ownerReportInput(query, now=new Date()) {
  for(const key of ['from','to'])if(query[key]!==undefined&&(typeof query[key]!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(query[key])||!Number.isFinite(Date.parse(query[key]))||new Date(query[key]).toISOString().slice(0,10)!==query[key]))throw new ApiError(400,'Dates must be valid YYYY-MM-DD values');
  const start=query.from?new Date(query.from+'T00:00:00.000Z'):new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const end=query.to?new Date(query.to+'T23:59:59.999Z'):now;
  if(start>end||end-start>366*86400000)throw new ApiError(400,'Choose a valid date range of up to 366 days');
  const page=Math.max(1,Math.min(100000,parseInt(query.page,10)||1));
  const filter={};const search=typeof query.search==='string'?query.search.trim().slice(0,100):'';
  if(search)filter.$or=['name','email'].map(field=>({[field]:{$regex:escapeRegex(search),$options:'i'}}));
  if(query.status==='blocked')filter.isBlocked=true;
  else if(query.status==='active'||query.status==='exhausted'){filter.isBlocked={$ne:true};filter.$expr={[query.status==='active'?'$gt':'$lte']:[available,0]};}
  else if(query.status)throw new ApiError(400,'Invalid company status');
  return {start,end,page,filter};
}
export async function ownerReport(query) {
  const now=new Date(),{start,end,page,filter}=ownerReportInput(query,now);
  const range={$gte:start,$lte:end};
  const [summary,trends,usage,companies,total,network,payments,couriers,recentPayments]=await Promise.all([
    Company.aggregate([{$group:{_id:null,total:{$sum:1},blocked:{$sum:{$cond:['$isBlocked',1,0]}},active:{$sum:{$cond:[{$and:[{$ne:['$isBlocked',true]},{$gt:[available,0]}]},1,0]}},exhausted:{$sum:{$cond:[{$and:[{$ne:['$isBlocked',true]},{$lte:[available,0]}]},1,0]}},available:{$sum:available},used:{$sum:'$bookingQuota.used'},held:{$sum:'$bookingQuota.held'},granted:{$sum:'$bookingQuota.purchased'},registrations:{$sum:{$cond:[{$and:[{$gte:['$createdAt',start]},{$lte:['$createdAt',end]}]},1,0]}}}}]),
    Company.aggregate([{$match:{createdAt:range}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'UTC'}},count:{$sum:1}}},{$sort:{_id:1}}]),
    Booking.aggregate([{$match:{bookingDate:range}},{$group:{_id:null,bookings:{$sum:1},cancelled:{$sum:{$cond:[{$eq:['$bookingStatus',5]},1,0]}},external:{$sum:{$cond:[{$eq:['$fulfilment','external']},1,0]}},international:{$sum:{$cond:[{$eq:['$category','international']},1,0]}},freightValue:{$sum:{$cond:[{$and:[{$ne:['$bookingStatus',5]},{$eq:['$confirmationStatus','confirmed']}]},'$grandTotal',0]}}}}]),
    Company.find(filter).select('name email phone state operatingCategories isBlocked bookingQuota createdAt').sort({createdAt:-1,_id:-1}).skip((page-1)*25).limit(25).lean(),
    Company.countDocuments(filter),
    Branch.aggregate([{$group:{_id:null,total:{$sum:1},franchises:{$sum:{$cond:[{$eq:['$ownershipType','franchise']},1,0]}},franchiseAllocated:{$sum:{$cond:[{$eq:['$ownershipType','franchise']},{$ifNull:['$franchiseQuota.allocated',0]},0]}},franchiseUsed:{$sum:{$cond:[{$eq:['$ownershipType','franchise']},{$ifNull:['$franchiseQuota.used',0]},0]}}}}]),
    Payment.aggregate([{$match:{createdAt:range}},{$group:{_id:'$currency',paid:{$sum:{$cond:[{$and:[{$eq:['$status','paid']},{$gte:['$paidAt',start]},{$lte:['$paidAt',end]}]},'$amount',0]}},pending:{$sum:{$cond:[{$eq:['$status','created']},1,0]}}}}]),
    CourierConnection.aggregate([{$match:{providerKey:'delhivery'}},{$group:{_id:'$environment',connected:{$sum:{$cond:['$connected',1,0]}},enabled:{$sum:{$cond:['$enabled',1,0]}}}}]),
    Payment.find({$or:[{paidAt:range},{createdAt:range}]}).select('companyId purpose amount currency status bookings providerKey createdAt paidAt').populate('companyId','name').sort({createdAt:-1,_id:-1}).limit(10).lean()
  ]);
  // Revenue follows capture time; do not lose payments whose order was created earlier.
  const captured=await Payment.aggregate([{$match:{status:'paid',paidAt:range}},{$group:{_id:'$currency',amount:{$sum:'$amount'},bookingPacks:{$sum:{$cond:[{$eq:['$purpose','booking-pack']},'$amount',0]}},services:{$sum:{$cond:[{$eq:['$purpose','service']},'$amount',0]}}}}]);
  const ids=companies.map(c=>c._id);
  const [bookings,branches]=await Promise.all([
    Booking.aggregate([{$match:{companyId:{$in:ids},bookingDate:range}},{$group:{_id:'$companyId',count:{$sum:1}}}]),
    Branch.aggregate([{$match:{companyId:{$in:ids}}},{$group:{_id:'$companyId',count:{$sum:1},franchises:{$sum:{$cond:[{$eq:['$ownershipType','franchise']},1,0]}}}}])
  ]);
  const counts=rows=>new Map(rows.map(r=>[String(r._id),r]));const bc=counts(bookings),br=counts(branches);
  return {generatedAt:now,paymentMode:process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')?'test':process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')?'live':'unconfigured',range:{from:start,to:end,timezone:'UTC'},summary:{total:0,active:0,blocked:0,exhausted:0,available:0,used:0,held:0,granted:0,registrations:0,...summary[0],branches:network[0]?.total||0,franchises:network[0]?.franchises||0,franchiseAllocated:network[0]?.franchiseAllocated||0,franchiseUsed:network[0]?.franchiseUsed||0,bookings:usage[0]?.bookings||0,cancelled:usage[0]?.cancelled||0,external:usage[0]?.external||0,international:usage[0]?.international||0,freightValue:usage[0]?.freightValue||0,pendingPayments:payments.reduce((n,p)=>n+p.pending,0)},revenue:captured,couriers,trends,recentPayments,companies:companies.map(c=>({...c,quota:quotaSummary(c.bookingQuota),status:c.isBlocked?'blocked':quotaSummary(c.bookingQuota).available>0?'active':'exhausted',bookings:bc.get(String(c._id))?.count||0,branches:br.get(String(c._id))?.count||0,franchises:br.get(String(c._id))?.franchises||0})),pagination:{page,pageSize:25,total,pages:Math.ceil(total/25)}};
}
