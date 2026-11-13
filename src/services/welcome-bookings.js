import Company from '../models/company.model.js';
import { QuotaEvent } from '../models/logistics.model.js';
import { transaction } from './quota.js';

export const WELCOME_BOOKINGS=100;
const eligibility={$or:[{'bookingQuota.freeGranted':{$exists:false}},{'bookingQuota.freeGranted':0}]};
const welcomeEvent=companyId=>({companyId,kind:'grant',count:WELCOME_BOOKINGS,amount:0,reference:'Company registration welcome bookings',operationKey:`welcome:${companyId}`});

export async function createRegisteredCompany(input){
  return transaction(async session=>{
    const [company]=await Company.create([{...input,companyAccess:true,bookingQuota:{purchased:WELCOME_BOOKINGS,used:0,held:0,revision:0,freeGranted:WELCOME_BOOKINGS,welcomeGrantedAt:new Date()}}],{session});
    await QuotaEvent.create([welcomeEvent(company._id)],{session});
    return company;
  });
}

// One-time backfill for companies already registered before this offer. Each
// grant and its unique audit event commit together; reruns add nothing twice.
export async function grantExistingCompanies(){
  return transaction(async session=>{
    const rows=await Company.find(eligibility).select('_id').session(session).lean();let granted=0;
    for(const row of rows){
      const result=await Company.updateOne({_id:row._id,...eligibility},{$inc:{'bookingQuota.purchased':WELCOME_BOOKINGS,'bookingQuota.revision':1},$set:{'bookingQuota.freeGranted':WELCOME_BOOKINGS,'bookingQuota.welcomeGrantedAt':new Date(),companyAccess:true}},{session});
      if(result.matchedCount===1){await QuotaEvent.create([welcomeEvent(row._id)],{session});granted++;}
    }
    return {companiesGranted:granted,freeBookingsPerCompany:WELCOME_BOOKINGS};
  });
}
