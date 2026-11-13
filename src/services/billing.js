import Company from '../models/company.model.js';
import { Booking } from '../models/booking.model.js';
import { ApiError } from '../utils/api-error.js';
import { quotaSummary, quotaStatus, transaction, changeQuota } from './quota.js';
export const PRICE_PAISE=Number(process.env.BOOKING_PACK_PRICE_PAISE||500000);
export const PACK_BOOKINGS=Number(process.env.BOOKING_PACK_BOOKINGS||10000);
export function bookingPack(){const amount=Number(process.env.BOOKING_PACK_PRICE_PAISE??PRICE_PAISE),bookings=Number(process.env.BOOKING_PACK_BOOKINGS??PACK_BOOKINGS);if(!Number.isSafeInteger(amount)||amount<100||!Number.isSafeInteger(bookings)||bookings<1)throw new ApiError(503,'Booking pack is not configured');return {id:'company-pack',amount,currency:'INR',bookings,expires:false,testOffer:process.env.BOOKING_PACK_TEST_OFFER==='true'};}
export function entitlement(company){const q=quotaSummary(company.bookingQuota);return {...q,canBook:!company.isBlocked&&q.available>0,blocked:!!company.isBlocked,pack:bookingPack()};}
export async function billingStatus(companyId,branchId){const result=await quotaStatus(companyId,branchId);return {...result,...result.company,pack:bookingPack(),quotaMode:'booking-packs'};}
export async function saveBillableBooking(booking,user={}) {
  const data=booking.toObject();
  return transaction(async session=>{
    const company=await Company.findById(data.companyId).select('operatingCategories isBlocked').session(session).lean();
    if(!company||company.isBlocked)throw new ApiError(403,'Company unavailable');
    const category=data.category||'domestic';
    if(company.operatingCategories&&company.operatingCategories!=='both'&&company.operatingCategories!==category)throw new ApiError(403,'Shipment category is not enabled by the company');
    const saved=new Booking(data);await changeQuota(saved,'consume',session,user.id||user.role||'');await saved.save({session});return saved;
  });
}
