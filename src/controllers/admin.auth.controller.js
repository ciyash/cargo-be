import { randomInt } from 'node:crypto';
import Branch from "../models/branch.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from '../models/admin.auth.model.js';
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { normalizeRole, roleLabel, permissionsFor, companyAdmin, staffAccessInput } from '../services/roles.js';
import { sendError } from '../utils/api-error.js';
import { updateStaffAccess, branchAssignmentFilter, setStaffBlocked } from '../services/staff-access.js';


dotenv.config();

const generateAdminUniqueId = () => Math.floor(100000 + Math.random() * 900000).toString();


const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: true },
});

const sendForgotPasswordOTP = async (email, otp) => {
  try {
    await transport.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Forgot Password OTP",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });
    // console.log("OTP sent successfully");
  } catch (error) {
    // console.error("Error sending OTP:", error);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Email is required" });
    }

    const subadmin = await Admin.findOne({ email:email.trim().toLowerCase() });
    if (!subadmin) {
      return res.status(200).json({ message: "If an account exists, OTP instructions have been sent" });
    }

    const otp = randomInt(100000,1000000).toString();
    subadmin.otp = otp;
    subadmin.otpAttempts=0;
    subadmin.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

    await subadmin.save();


    await sendForgotPasswordOTP(email, otp);

    res.status(200).json({ message: "If an account exists, OTP instructions have been sent" });
  } catch (error) {

    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const resetPassword = async (req,res) => {
  try {
    const {email,otp,newPassword}=req.body;
    if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email.trim())||!['string','number'].includes(typeof otp)||!/^\d{6}$/.test(String(otp))||typeof newPassword!=='string'||newPassword.length<8||newPassword.length>1024)return res.status(400).json({message:'Provide a valid email, six-digit OTP and password of at least 8 characters'});
    // Charge each guess atomically, across clients, and allow at most five guesses per OTP.
    const subadmin=await Admin.findOneAndUpdate({email:email.trim().toLowerCase(),otpExpires:{$gt:new Date()},$or:[{otpAttempts:{$exists:false}},{otpAttempts:{$lt:5}}]},{$inc:{otpAttempts:1}},{new:true});
    if(!subadmin||String(subadmin.otp)!==String(otp))return res.status(400).json({message:'Invalid or expired OTP'});
    const password=await bcrypt.hash(newPassword,10);
    const result=await Admin.updateOne({_id:subadmin._id,password:subadmin.password,otp:Number(otp),otpExpires:{$gt:new Date()}},{$set:{password},$unset:{otp:1,otpExpires:1,otpAttempts:1}});
    if(result.matchedCount!==1)return res.status(400).json({message:'Invalid or expired OTP'});
    return res.json({message:'Password reset successfully'});
  }catch(error){return res.status(500).json({message:'Could not reset password'});}
};
const signup = async (req, res) => {
  try {
    const {
      name,
      username,
      address,
      phone,
      email,
      password,
      branchId,
      location,
      documents,
      role: requestedRole = "staff"
    } = req.body;

    if (typeof name !== "string" || !name.trim() ||
        typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Name, valid email and password of at least 8 characters are required" });
    }
    if (!normalizeRole(requestedRole) || requestedRole==='company') {
      return res.status(400).json({ message: "Invalid staff role" });
    }
    if (normalizeRole(requestedRole)!=='company_admin' && !branchId && !req.user?.branchObjectId) {
      return res.status(400).json({ message: "branchId is required for this role" });
    }

    const {role,permissions}=staffAccessInput({...req.body,role:requestedRole},req.user);
    let companyId = req.user?.companyId;

    // If companyId is not present (e.g., admin is creating new employee), fetch it from admin's DB record
    if (!companyId && req.user?._id) {
      const admin = await Admin.findById(req.user._id);
      if (!admin) return res.status(404).json({ message: "Admin not found" });
      companyId = admin.companyId;
    }

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    // Check if email or phone already exists

     const existingUser = username ? await Admin.findOne({ username }) : null;
    if (existingUser) return res.status(400).json({ message: "Username already registered" });


    const existingEmail = await Admin.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email already registered" });

    const existingPhone = phone ? await Admin.findOne({ phone }) : null;
    if (existingPhone) return res.status(400).json({ message: "Phone already registered" });

    const subadminUniqueId = generateAdminUniqueId();
    const hashedPassword = await bcrypt.hash(password, 10);

    const finalBranchId = role==='company_admin' ? null : companyAdmin(req.user)?branchId:req.user.branchObjectId;
    if(!companyAdmin(req.user)&&branchId&&String(branchId)!==String(finalBranchId))return res.status(403).json({message:'Use your assigned branch'});
    if (finalBranchId && !await Branch.exists(branchAssignmentFilter(companyId,finalBranchId,req.body.branchCity))) return res.status(400).json({ message: 'Choose a branch in the selected city belonging to this company' });

    const newAdmin = new Admin({
      companyId,
      subadminUniqueId,
      name,
      username,
      address,
      phone,
      email,
      password: hashedPassword,
      branchId: finalBranchId,
      location,
      documents,
      role,
      permissions,
    });

    await newAdmin.save();

    res.status(201).json({ message: roleLabel(role)+' account created', subadmin: newAdmin });

  } catch (err) {
    sendError(res,err);
  }
};




const login = async (req, res) => {
  try {
    if (req.body.companyId !== undefined && (typeof req.body.companyId !== 'string' || !/^[a-f0-9]{24}$/i.test(req.body.companyId))) return res.status(400).json({ message: 'Invalid company login link' });
    const { identifier, password } = req.body;

    if (typeof identifier!=='string' || !identifier.trim() || typeof password!=='string' || !password || password.length>1024) {
      return res.status(400).json({
        message: "Email, Phone, or Username, and password are required"
      });
    }

    // Find the subadmin and populate branch + company
    const subadmin = await Admin.findOne({
      ...(req.body.companyId ? { companyId: req.body.companyId } : {}),
      $or: [
        { email: identifier },
        { phone: identifier },
        { username: identifier }
      ]
    })
    .populate({
      path: "branchId",
      select: "branchUniqueId location name city"
    })
    .populate({
      path: "companyId",
      select: "name code logoText" // populate only required fields
    });
// console.log("Company Info:", subadmin.companyId);

    if (!subadmin) {
      return res.status(404).json({ message: "Employee not found!" });
    }

    if(subadmin.isBlocked)return res.status(403).json({message:'This account is blocked. Contact your company administrator.'});

    const isMatch = await bcrypt.compare(password, subadmin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
                      req.socket?.remoteAddress ||
                      req.connection?.remoteAddress;

    await Admin.findByIdAndUpdate(subadmin._id, { ipAddress });

    // Extract branch info
    const branch = subadmin.branchId || {};

    // Extract company info
    const company = subadmin.companyId || {};

    const tokenPayload = {
      roleVersion: 2,
      roleVersion: 2,
      subadminUniqueId: subadmin.subadminUniqueId,
      id: subadmin._id,
      role: normalizeRole(subadmin.role),
      roleLabel: roleLabel(subadmin.role),
      permissions: permissionsFor(subadmin),
      name: subadmin.name,
      location: subadmin.location,
      branchId: branch.branchUniqueId || null,
      branchLocation: branch.location || "Not Assigned",
      branchName: branch.name || "Not Assigned",
      branchCity: branch.city || "Not Assigned",
      ipAddress,

      // Ã¢Å“â€¦ Full company details  tokenss
      companyId: company._id?.toString() || null,
      companyName: company.name || null,
      companyCode: company.code || null,
      companyShortCode: company.name?.substring(0, 2).toUpperCase() || null
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });

    res.status(200).json({
      message: "Login successful",
      roleVersion: 2,
      roleVersion: 2,
      accountType: 'staff',
      token,
      role: normalizeRole(subadmin.role),
      roleLabel: roleLabel(subadmin.role),
      permissions: permissionsFor(subadmin)
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
};


const changeAdminPassword = async (req, res) => {
  try {
    const id = req.user?.id;
    if (!id) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    const { oldPassword, newPassword } = req.body;
    if (typeof oldPassword!=='string' || typeof newPassword!=='string' || newPassword.length<8 || newPassword.length>1024) {
      return res.status(400).json({ success: false, message: "Old password and new password are required" });
    }

    const subadmin = await Admin.findById(id);
    if (!subadmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, subadmin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect old password" });
    }

    const isSamePassword = await bcrypt.compare(newPassword, subadmin.password);
    if (isSamePassword) {
      return res.status(400).json({ success: false, message: "New password must be different from old password" });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    subadmin.password = hashedPassword;

    // **Ensure all required fields are preserved before saving**
    await subadmin.save({ validateBeforeSave: false });

    res.status(200).json({message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const getAdminById = async (req, res) => {
  try {
    if(req.user?.accountType==='company')return res.json({name:req.user.name,role:'company_admin',roleLabel:'Company Admin',permissions:req.user.permissions,companyId:req.company});
    const id = req.user?.id;
    if (!id) {
      return res.status(400).json({ message: "Invalid or missing subadmin ID" });
    }

    const subadmin = await Admin.findById(id)
      .populate({
        path: 'branchId',
        select: 'name city branchUniqueId companyId',
        populate: {
          path: 'companyId',
          model: 'Company',
          select: 'name email phone subscription logoText',
        },
      })
      .populate({
        path: 'companyId', // <-- populate the companyId directly from Admin schema
        model: 'Company',
        select: 'name email phone subscription logoText',
      });

    if (!subadmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(subadmin);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


const getAllAdmins = async (req, res) => {
  try {
    const companyId = req.user?.companyId; // Get companyId from token
    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing" });
    }

    const subadmins = await Admin.find({ companyId })
      .populate("branchId", "name branchUniqueId branchType city location address")
      .populate("companyId", "name email phone address state customerName");

    if (subadmins.length === 0) {
      return res.status(404).json({ message: "No admin subadmins in database" });
    }

    res.status(200).json(subadmins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllEmployees = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const role = req.user?.role;

    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing" });
    }

    if (role !== "company_admin") {
      return res.status(403).json({ message: "Forbidden: Only admin can access this resource" });
    }

    const subadmins = await Admin.find({ companyId })
      .populate("branchId", "name branchUniqueId branchType city location address")
      .populate("companyId", "name email logo phone address state customerName");

    if (subadmins.length === 0) {
      return res.status(404).json({ message: "No subadmins in database" });
    }

    res.status(200).json(subadmins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



const getAdminsByBranchName = async (req, res) => {
  try {
    const branchName = req.params.branchName || req.body?.branchName; // Get branch name from request body

    if (!branchName) {
      return res.status(400).json({ message: "Branch name is required" });
    }

    // Find subadmins and populate branchId with only 'name' field
    const subadmins = await Admin.find({ companyId: req.user.companyId }).select("-password -otp -otpExpires").populate({
      path: "branchId",
      select: "name",
    });

    // Filter subadmins where branchId.name matches the given name
    const filteredAdmins = subadmins.filter(
      (subadmin) => subadmin.branchId?.name === branchName
    );

    if (filteredAdmins.length === 0) {
      return res.status(404).json({ message: "No subadmins found for this branch" });
    }

    res.status(200).json(filteredAdmins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const id = req.user?.id;
    const subadmin = await Admin.findById(id);

    if (!subadmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    await Admin.findByIdAndDelete(id);
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


const updateAccount = async(req,res)=>{
  try{
    const target=await updateStaffAccess(req.user,req.params.id,req.body,{save:false});
    if(req.body.name!==undefined&&(typeof req.body.name!=='string'||!req.body.name.trim()))return res.status(400).json({message:'Enter a valid account name'});
    if(req.body.email!==undefined&&(typeof req.body.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email.trim())))return res.status(400).json({message:'Enter a valid email address'});
    const identities=[];
    if(req.body.email!==undefined&&req.body.email.trim().toLowerCase()!==target.email)identities.push({email:req.body.email.trim().toLowerCase()});
    if(req.body.username!==undefined&&typeof req.body.username!=='string')return res.status(400).json({message:'Enter a valid username'});
    if(req.body.username&&req.body.username!==target.username)identities.push({username:req.body.username});
    if(req.body.phone&&req.body.phone!==target.phone)identities.push({phone:req.body.phone});
    if(identities.length&&await Admin.exists({_id:{$ne:target._id},$or:identities}))return res.status(409).json({message:'Email, username or phone is already in use'});
    for(const key of ['name','email','username','phone','location','documents','address'])if(req.body[key]!==undefined)target[key]=req.body[key];
    if(req.body.email!==undefined)target.email=req.body.email.trim().toLowerCase();
    if(req.body.password){if(typeof req.body.password!=='string'||req.body.password.length<8)return res.status(400).json({message:'Password must have at least 8 characters'});target.password=await bcrypt.hash(req.body.password,10);}
    await target.save();res.json({message:'Account updated',subadmin:target});
  }catch(error){sendError(res,error);}
};

const updateAccountStatus=async(req,res)=>{
  try{
    const target=await setStaffBlocked(req.user,req.params.id,req.body.isBlocked);
    res.json({message:target.isBlocked?'Account blocked':'Account unblocked',account:target});
  }catch(error){return sendError(res,error);}
};

const updateAdmin = async (req, res) => {
  try {
    const id = req.user?.id;
    const role = req.user?.role;

    // Ã¢Å“â€¦ Only allow users with role 'admin' to update their own profile
    if (role !== "company_admin") {
      return res.status(403).json({ message: "Forbidden: Only admin can update their profile" });
    }

    if (!id) {
      return res.status(400).json({ message: "Admin ID is missing" });
    }

    const { email, phone, name, location,branchId, address, password, documents } = req.body;

    const updateData = {};
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (address) updateData.address = address;
    if (branchId) {
      if (!await Branch.exists({ _id: branchId, companyId: req.user.companyId })) return res.status(400).json({ message: 'Branch does not belong to this company' });
      updateData.branchId = branchId;
    }
    if (documents) updateData.documents = documents;

    if (password) {
      if(typeof password!=='string'||password.length<8||password.length>1024)return res.status(400).json({message:'Password must have at least 8 characters'});
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedAdmin = await Admin.findOneAndUpdate(
      { _id: id, role: "company_admin" }, // Ensure only admins update their own profile
      updateData,
      { new: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found or not authorized" });
    }

    res.status(200).json({
      message: "Admin profile updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



const deletePersons = async (req, res) => {
  try {
    const id = req.body?.id;
    if (!id) return res.status(400).json({ message: "id is required" });

    const subadmin = await Admin.findOne({ _id: id, companyId: req.user.companyId });

    if (!subadmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    await Admin.findOneAndDelete({ _id: id, companyId: req.user.companyId });
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export default {
  signup,
  login,
  forgotPassword,
  resetPassword,
  changeAdminPassword,
  getAllAdmins,
  getAdminById,
  deleteAdmin,
  updateAccount,
  updateAccountStatus,
  updateAdmin,
  getAdminsByBranchName,
  getAllEmployees,
  deletePersons
};

