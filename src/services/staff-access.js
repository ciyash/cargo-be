import Staff from '../models/admin.auth.model.js';
import Branch from '../models/branch.model.js';
import { ApiError, escapeRegex } from '../utils/api-error.js';
import { companyAdmin, normalizeRole, staffAccessInput, hasPermission } from './roles.js';
export function branchAssignmentFilter(companyId,branchId,branchCity){
  const filter={_id:branchId,companyId};
  if(branchCity!==undefined){
    if(typeof branchCity!=='string'||!branchCity.trim()||branchCity.length>100)throw new ApiError(400,'Select a valid city for the assigned branch');
    filter.city={$regex:new RegExp('^'+escapeRegex(branchCity.trim())+'$','i')};
  }
  return filter;
}
export async function updateStaffAccess(actor,id,input,{save=true}={}) {
  if(!companyAdmin(actor)&&!(normalizeRole(actor.role)==='admin'&&hasPermission(actor,'team')))throw new ApiError(403,'Staff management permission required');
  if(!companyAdmin(actor)&&!actor.branchObjectId)throw new ApiError(403,'Assign a branch before managing Staff');
  const filter={_id:id,companyId:actor.companyId,...(!companyAdmin(actor)?{branchId:actor.branchObjectId||'__unassigned__',role:'staff'}:{})};
  const target=await Staff.findOne(filter);
  if(!target)throw new ApiError(404,'Staff account not found in your scope');
  if(String(target._id)===String(actor.id))throw new ApiError(409,'Ask another Company Admin to change your own access');
  const changingRole=input.role!==undefined&&normalizeRole(input.role)!==normalizeRole(target.role);
  const access=staffAccessInput({...input,permissions:input.permissions??(changingRole?undefined:target.permissions)},actor,target.role);
  const branchId=access.role==='company_admin'?null:companyAdmin(actor)?input.branchId??target.branchId:actor.branchObjectId;
  if(access.role!=='company_admin'&&(!branchId||!await Branch.exists(branchAssignmentFilter(actor.companyId,branchId,input.branchCity))))throw new ApiError(400,'Choose a branch in the selected city belonging to this company');
  Object.assign(target,access,{branchId});if(save)await target.save();return target;
}

export async function setStaffBlocked(actor,id,isBlocked){
  if(!companyAdmin(actor))throw new ApiError(403,'Only Company Admin can block or unblock team accounts');
  if(typeof isBlocked!=='boolean')throw new ApiError(400,'isBlocked must be true or false');
  if(String(id)===String(actor.id))throw new ApiError(409,'You cannot block your own account');
  const target=await Staff.findOne({_id:id,companyId:actor.companyId});
  if(!target)throw new ApiError(404,'Team account not found in your company');
  target.isBlocked=isBlocked;
  await target.save();
  return target;
}
