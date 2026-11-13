import mongoose from 'mongoose';
import { City } from '../models/multi.model.js';
import Branch from '../models/branch.model.js';
import { ApiError, escapeRegex } from '../utils/api-error.js';
import { transaction } from './quota.js';

const clean=(value,label,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new ApiError(400,`Provide a valid ${label}`);return value.trim().replace(/\s+/g,' ');};
export function normalizeCity(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'Provide city details');
  const cityName=clean(input.cityName,'city name',100),state=clean(input.state,'state / region',100);
  let country=clean(input.country??'India','country',100);if(country.toLowerCase()==='india')country='India';
  return {cityName,cityKey:cityName.toLowerCase(),state,country,code:input.code?clean(input.code,'city code',30):'',address:input.address?clean(input.address,'city address',500):''};
}
export async function resolveBranchCity(companyId,input){
  let filter={companyId};
  if(input.cityId){if(typeof input.cityId!=='string'||!mongoose.isValidObjectId(input.cityId))throw new ApiError(400,'Select a valid company city');filter._id=input.cityId;}
  else filter.cityName={$regex:new RegExp('^'+escapeRegex(clean(input.city,'city',100))+'$','i')};
  const city=await City.findOne(filter).lean();
  if(!city)throw new ApiError(400,'Add the city under Company Cities first, then select it to create a branch');
  return {cityId:city._id,city:city.cityName,state:city.state,country:city.country||'India'};
}
export function cityBranchFilter(companyId,city){return {companyId,$or:[{cityId:city._id},{cityId:null,city:{$regex:new RegExp('^'+escapeRegex(city.cityName)+'$','i')}}]};}
export async function editCompanyCity(companyId,id,input){
  if(typeof id!=='string'||!mongoose.isValidObjectId(id))throw new ApiError(400,'Select a valid company city');
  return transaction(async session=>{
    const city=await City.findOne({_id:id,companyId}).session(session).lean();
    if(!city)throw new ApiError(404,'City not found');
    const data=normalizeCity({...city,...input});
    const duplicate=await City.findOne({companyId,_id:{$ne:city._id},$or:[{cityKey:data.cityKey},{cityName:{$regex:new RegExp('^'+escapeRegex(data.cityName)+'$','i')}}]}).session(session).lean();
    if(duplicate)throw new ApiError(409,'This city already exists for your company');
    const updated=await City.findOneAndUpdate({_id:city._id,companyId},{$set:data},{new:true,runValidators:true,session});
    if(!updated)throw new ApiError(404,'City no longer exists');
    let branchesUpdated=0;
    if(data.cityName!==city.cityName||data.state!==city.state||data.country!==(city.country||'India')){
      const result=await Branch.updateMany(cityBranchFilter(companyId,city),{$set:{cityId:city._id,city:data.cityName,state:data.state,country:data.country}},{session,runValidators:true});
      branchesUpdated=result.modifiedCount;
    }
    // Bookings, invoices and provider addresses remain historical snapshots.
    return {city:updated,branchesUpdated};
  });
}
export async function ensureCityUnused(companyId,cities){
  for(const city of cities)if(await Branch.exists(cityBranchFilter(companyId,city)))throw new ApiError(409,'This city has branches. Keep its name, state and country, and manage those branches first');
}
