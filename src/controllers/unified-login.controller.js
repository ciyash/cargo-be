import bcrypt from 'bcryptjs';
import Company from '../models/company.model.js';
import companyController from './company.controller.js';
import staffController from './admin.auth.controller.js';

// Both account stores share one login page. Existing passwords/accounts are retained.
export async function unifiedLogin(req,res,next) {
  try {
    const {identifier,password,companyId}=req.body;
    if(typeof identifier!=='string'||!identifier.trim()||typeof password!=='string'||!password)return res.status(400).json({message:'Enter your email, username or phone and password'});
    if(companyId!==undefined&&(typeof companyId!=='string'||!/^[a-f0-9]{24}$/i.test(companyId)))return res.status(400).json({message:'Invalid company login link'});
    const email=identifier.trim().toLowerCase();
    const company=email.includes('@')?await Company.findOne({email,...(companyId?{_id:companyId}:{})}):null;
    if(company&&await bcrypt.compare(password,company.password)) {
      req.body={...req.body,email,password};return companyController.loginCompany(req,res);
    }
    req.body={...req.body,identifier:identifier.trim()};
    return staffController.login(req,res);
  }catch(error){next(error);}
}
