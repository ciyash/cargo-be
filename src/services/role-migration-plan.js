// Migration definitions only. This module is not connected to live auth.
export const CANONICAL_ROLES = ['company_admin','admin','staff'];
export const LEGACY_ROLE_MAPPING = Object.freeze({
  admin:'company_admin',superadmin:'company_admin',company_admin:'company_admin',
  subadmin:'admin',branch_admin:'admin',employee:'staff',staff:'staff',
  accountant:'staff',superviser:'staff',supervisor:'staff',driver:'staff',
});
export function planRoleMigration(accounts){
 const changes=[],issues=[],counts={before:{},after:{}};
 for(const account of accounts){
  const role=account.roleVersion===2?(CANONICAL_ROLES.includes(account.role)?account.role:null):LEGACY_ROLE_MAPPING[account.role];
  counts.before[account.role]=(counts.before[account.role]||0)+1;
  if(!role){issues.push({id:String(account._id),reason:'Unknown role'});continue;}
  counts.after[role]=(counts.after[role]||0)+1;
  if(role!=='company_admin'&&!account.branchId)issues.push({id:String(account._id),reason:'Assigned branch required'});
  if(['accountant','superviser','supervisor','driver'].includes(account.role))issues.push({id:String(account._id),reason:'Review existing restricted work permissions before Staff migration'});
  if(account.roleVersion!==2)changes.push({id:String(account._id),from:account.role,to:role,roleVersion:2});
 }
 return {counts,changes,issues,ready:issues.length===0};
}
