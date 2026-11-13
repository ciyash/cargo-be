import jwt from 'jsonwebtoken';
import Company from '../models/company.model.js';
import Staff from '../models/admin.auth.model.js';
import Branch from '../models/branch.model.js';
import { ApiError } from '../utils/api-error.js';
import { companyAdmin, normalizeRole, roleLabel, permissionsFor } from '../services/roles.js';
export const isManager = companyAdmin;
export function requireManager(req,res,next) { if (!isManager(req.user)) return next(new ApiError(403,'Company admin access required')); next(); }
export async function workspaceAuth(req,res,next) {
  try {
    const header=req.get('Authorization');
    if(!header?.startsWith('Bearer ')) throw new ApiError(401,'Sign in to continue');
    let claims;
    try { claims=jwt.verify(header.slice(7),process.env.COMPANY_SECRET,{algorithms:['HS256']}); if(claims.role!=='company'||!claims.companyId)claims=null;else claims.accountType='company'; } catch {}
    if(!claims){try { claims=jwt.verify(header.slice(7),process.env.JWT_SECRET,{algorithms:['HS256']}); } catch {throw new ApiError(401,'Invalid or expired session');}
      if(!claims.id||!claims.companyId)throw new ApiError(401,'Invalid staff session');
      const staff=await Staff.findOne({_id:claims.id,companyId:claims.companyId}).select('-password -otp -otpExpires').lean();
      if(!staff||!normalizeRole(staff.role))throw new ApiError(401,'Staff account no longer exists or has an invalid role');
      if(staff.isBlocked)throw new ApiError(403,'This account is blocked. Contact your company administrator.');
      if(staff.isBlocked)throw new ApiError(403,'This account is blocked. Contact your company administrator.');
      const branch=staff.branchId?await Branch.findOne({_id:staff.branchId,companyId:staff.companyId}).lean():null;
      if(normalizeRole(staff.role)!=='company_admin'&&!branch)throw new ApiError(403,'Assign a company branch before signing in');
      claims={...claims,accountType:'staff',role:normalizeRole(staff.role),permissions:permissionsFor(staff),name:staff.name,branchObjectId:branch?String(branch._id):null,branchId:branch?.branchUniqueId||null,branchName:branch?.name,branchCity:branch?.city};
    }
    const company=await Company.findById(claims.companyId).select('-password').lean();
    if(!company||company.isBlocked)throw new ApiError(403,'Company access is unavailable');
    if(claims.accountType==='company'){claims.role='company_admin';claims.permissions=permissionsFor({role:'company'});claims.name=company.customerName||company.name;}
    claims.roleLabel=roleLabel(claims.role);
    claims.companyName=company.name;
    req.user=claims;req.company=company;next();
  }catch(error){next(error);}
}
