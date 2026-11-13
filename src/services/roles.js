import { ApiError } from '../utils/api-error.js';

// Persist these three roles for new accounts. Historical values remain readable.
export const ROLES = ['company_admin', 'admin', 'staff'];
export const ROLE_LABELS = { company_admin: 'Company Admin', admin: 'Branch Admin', staff: 'Staff' };
export const WORK_PERMISSIONS = ['bookings', 'loading', 'delivery', 'accounts', 'reports'];
export const PERMISSIONS = [...WORK_PERMISSIONS, 'team', 'settings', 'subscription', 'services', 'branches'];
const aliases = { company:'company_admin', superadmin:'company_admin', company_admin:'company_admin', admin:'admin', subadmin:'admin', branch_admin:'admin', employee:'staff', staff:'staff', accountant:'staff', superviser:'staff', supervisor:'staff', driver:'staff' };
export const normalizeRole = role => typeof role==='string'&&Object.hasOwn(aliases,role)?aliases[role]:null;
export const roleLabel = role => ROLE_LABELS[normalizeRole(role)] || 'Unknown role';
export const companyAdmin = user => normalizeRole(user?.role) === 'company_admin';
export function defaultPermissions(role) {
  if(normalizeRole(role)==='company_admin')return [...PERMISSIONS];
  if(normalizeRole(role)==='admin')return [...WORK_PERMISSIONS,'team'];
  if(role==='employee'||role==='staff')return [...WORK_PERMISSIONS];
  if(role==='accountant')return ['accounts','reports'];
  if(role==='driver')return ['delivery'];
  if(role==='superviser'||role==='supervisor')return ['loading','delivery','reports'];
  return ['bookings','loading','delivery','reports'];
}
export function permissionsFor(account) {
  const role=normalizeRole(account?.role);
  if(!role)return [];
  if(role==='company_admin')return [...PERMISSIONS];
  if(account.role==='employee'||account.role==='staff')return [...WORK_PERMISSIONS];
  const allowed=role==='admin'?[...WORK_PERMISSIONS,'team']:WORK_PERMISSIONS;
  return [...new Set((Array.isArray(account.permissions)?account.permissions:defaultPermissions(account.role)).filter(p=>allowed.includes(p)))];
}
export const hasPermission=(user,permission)=>permissionsFor(user).includes(permission);
export const hasAnyPermission=(user,...permissions)=>permissions.some(p=>hasPermission(user,p));
export function validatePermissions(values,role,actor) {
  if(!Array.isArray(values)||values.some(p=>typeof p!=='string'||!PERMISSIONS.includes(p)))throw new ApiError(400,'Select valid work permissions');
  const allowed=normalizeRole(role)==='company_admin'?PERMISSIONS:normalizeRole(role)==='admin'?[...WORK_PERMISSIONS,'team']:WORK_PERMISSIONS;
  const result=[...new Set(values)];
  if(result.some(p=>!allowed.includes(p)))throw new ApiError(403,'This role cannot receive company administration permissions');
  if(actor&&!companyAdmin(actor)&&result.some(p=>!hasPermission(actor,p)))throw new ApiError(403,'You can only assign work permissions you have');
  return result;
}
export function staffAccessInput(input,actor,originalRole) {
  const requested=input.role??originalRole??'staff',role=normalizeRole(requested);
  if(!role||requested==='company')throw new ApiError(400,'Choose Company Admin, Branch Admin or Staff');
  if(!companyAdmin(actor)&&(normalizeRole(actor?.role)!=='admin'||!hasPermission(actor,'team')||role!=='staff'))throw new ApiError(403,'Branch Admin can manage Staff in their assigned branch only');
  const defaults=defaultPermissions(requested);
  const permissions=role==='company_admin'?[...PERMISSIONS]:validatePermissions(input.permissions??defaults,role,actor);
  return {role,permissions:['employee','staff'].includes(requested)?validatePermissions([...WORK_PERMISSIONS],role,actor):permissions};
}

// Classify legacy endpoints too, so their URLs cannot bypass work permissions.
export function legacyPermission(req) {
  const base=req.baseUrl||'',route=String(req.route?.path||req.path||'').toLowerCase(),path=(base+route).toLowerCase(),read=['GET','HEAD'].includes(req.method);
  if(base==='/subadmin-auth')return /profile|password/.test(route)?null:'team';
  if(base==='/branch')return read||route==='/daterange'?null:'branches';
  if(base==='/multi-router'||base==='/vehicle'||base==='/extra-charge')return read||/filter|city-wise/.test(route)?null:'settings';
  if(base==='/cfmaster'&&read)return 'credit-parties';
  if(['/bank','/item','/vendor'].includes(base))return read?'accounts':'settings';
  if(['/expensive','/cfmaster','/cfextra-charge','/voucher-generate'].includes(base))return 'accounts';
  if(base==='/branch-report')return 'reports';
  if(base==='/parcel-loading')return /report|voucher|details/.test(path)?'loading':'loading';
  if(base==='/parcel-unloading')return 'delivery';
  if(base==='/booking') {
    if(/report|summary|stock|collection|account|consolidat|luggage|memo|get-total|get-above700|todaybookings|status-wise/.test(route))return 'reports';
    if(/delivery-booking|update\/:id|updateallgrn|markparcel/.test(route))return 'delivery';
    if(req.method==='DELETE')return 'settings';
    if(req.method==='PATCH'||route==='/'&&!read||/cancelbooking/.test(route))return 'bookings';
    return 'shipment-read';
  }
  return null;
}
export function authorizeLegacy(req,res,next) {
  const permission=legacyPermission(req);
  const allowed=!permission||(permission==='shipment-read'?hasAnyPermission(req.user,...WORK_PERMISSIONS):permission==='credit-parties'?hasAnyPermission(req.user,'bookings','accounts'):hasPermission(req.user,permission));
  if(!allowed)return next(new ApiError(403,'Your account does not have permission for this action'));
  next();
}
