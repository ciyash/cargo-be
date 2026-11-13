import mongoose from 'mongoose';
import { City } from '../models/multi.model.js';
import { ApiError, sendError, escapeRegex } from '../utils/api-error.js';
import { companyAdmin } from '../services/roles.js';
import { normalizeCity, ensureCityUnused, editCompanyCity } from '../services/company-cities.js';

function access(req,write=false){
  if(!req.user?.companyId)throw new ApiError(401,'Company ID is required');
  if(write&&!companyAdmin(req.user))throw new ApiError(403,'Only Company Admin can manage cities');
  return req.user.companyId;
}
async function createCity(req,res){
  try{
    const companyId=access(req,true),data=normalizeCity(req.body);
    if(await City.findOne({companyId,cityName:{$regex:new RegExp('^'+escapeRegex(data.cityName)+'$','i')}}))throw new ApiError(409,'This city already exists for your company');
    const city=await new City({...data,companyId}).save();
    return res.status(201).json({message:'City added successfully',city});
  }catch(error){return sendError(res,error);}
}
async function getCities(req,res){
  try{return res.status(200).json(await City.find({companyId:access(req)}).sort({cityName:1,_id:1}).lean());}
  catch(error){return sendError(res,error);}
}
async function updateCity(req,res){
  try{
    const {city,branchesUpdated}=await editCompanyCity(access(req,true),req.params.id,req.body);
    return res.json({success:true,data:city,branchesUpdated});
  }catch(error){return sendError(res,error);}
}
async function deleteCity(req,res){
  try{
    const companyId=access(req,true),city=await City.findOne({_id:req.params.id,companyId}).lean();
    if(!city)throw new ApiError(404,'City not found');
    await ensureCityUnused(companyId,[city]);await City.deleteOne({_id:city._id,companyId});
    return res.json({message:'City deleted'});
  }catch(error){return sendError(res,error);}
}
async function deleteSelectedCities(req,res){
  try{
    const companyId=access(req,true),ids=req.body.cityIds;
    if(!Array.isArray(ids)||!ids.length||ids.length>1000||ids.some(id=>typeof id!=='string'||!mongoose.isValidObjectId(id))||new Set(ids).size!==ids.length)throw new ApiError(400,'Select distinct valid company city IDs');
    const cities=await City.find({companyId,_id:{$in:ids}}).lean();
    if(cities.length!==ids.length)throw new ApiError(404,'Some cities do not belong to your company');
    await ensureCityUnused(companyId,cities);
    const result=await City.deleteMany({companyId,_id:{$in:ids}});
    return res.json({success:true,message:'Selected cities deleted',deletedCount:result.deletedCount});
  }catch(error){return sendError(res,error);}
}
export default {createCity,getCities,updateCity,deleteCity,deleteSelectedCities};
