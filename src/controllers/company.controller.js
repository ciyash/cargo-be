import Company from "../models/company.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logoMime } from '../utils/company-branding.js';
import { permissionsFor } from '../services/roles.js';
import { createRegisteredCompany } from '../services/welcome-bookings.js';

// Public registration always creates an independent company.
const registerCompany = (req, res) => {
  req.body = { ...req.body, parentCompanyId: null };
  return registerSubsidiaryCompany(req, res);
};


// Register Subsidiary
const registerSubsidiaryCompany = async (req, res) => {
  try {
    if(req.body.parentCompanyId)return res.status(403).json({message:'Public registration cannot attach a company to another company'});
    if (req.body.logoText !== undefined && (typeof req.body.logoText !== 'string' || (req.body.logoText.trim() !== '' && !/^[a-z]{2}$/i.test(req.body.logoText.trim())))) return res.status(400).json({ message: 'Enter exactly two letters for the logo, or leave blank to use company initials' });
    if (req.file && !logoMime(req.file.buffer)) return res.status(400).json({ message: 'Upload a PNG, JPEG or WebP company logo up to 5 MB' });
    let {
      name,
      email,
      password,
      parentCompanyId,
      phone,
      address,
      state,
      customerName
    } = req.body;

    if (typeof name !== "string" || !name.trim() ||
        typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Company name, valid email and password of at least 8 characters are required" });
    }
    email = email.trim().toLowerCase();

    //  const logo = req.file.buffer.toString("base64");
     const logo = req.file ? req.file.buffer.toString("base64") : "";


    const existing = await Company.findOne({ email });
    if (existing) return res.status(400).json({ msg: "Company already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const newCompany = await createRegisteredCompany({
      logoText: req.body.logoText?.trim() || '',
      name,
      email,
      password: hashed,
      phone,
      logo,
      address,
      state,
      customerName,
      parentCompany: parentCompanyId,
      subscription: {
        plan: "monthly",
        validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    res.status(201).json({ msg: parentCompanyId ? "Subsidiary registered" : "Company registered successfully", company: newCompany });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Company already exists" });
    res.status(500).json({ error: err.message });
  }
};

//

const loginCompany = async (req, res) => {
  try {
    if (req.body.companyId !== undefined && (typeof req.body.companyId !== 'string' || !/^[a-f0-9]{24}$/i.test(req.body.companyId))) return res.status(400).json({ message: 'Invalid company login link' });
    const { email, password } = req.body;
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Check if company exists
    const company = await Company.findOne({ email: email.trim().toLowerCase() }).populate("parentCompany", "name email");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    if (req.body.companyId && String(company._id) !== req.body.companyId.toLowerCase()) return res.status(401).json({ message: 'These credentials do not belong to this company login page' });

    // Check password
    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check block status
    if (company.isBlocked) {
      return res.status(403).json({ message: "Company is blocked" });
    }

    // Save login IP
    company.lastLoginIp = ipAddress;
    await company.save();

    // Handle parentCompany ID safely
    const shopGlobalId =
      company.parentCompany && typeof company.parentCompany === "object"
        ? company.parentCompany._id?.toString()
        : company.parentCompany?.toString() || null;

    // Prepare token payload
    const tokenPayload = {
      companyId: company._id.toString(),
      email: company.email,
      role: "company",
      shopGlobalId,
    };

    // Sign token
    const token = jwt.sign(tokenPayload, process.env.COMPANY_SECRET, {expiresIn: "1d"});

       console.log("🔐 Logged in Company ID:", tokenPayload.companyId);

    res.status(200).json({
      message: "Company logged in successfully",
      role: 'company_admin', roleLabel: 'Company Admin', accountType: 'company', permissions: permissionsFor({role:'company'}),
      token,
      company
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


const updateCompany = async (req, res) => {
  try {
    if (req.body.logoText !== undefined && (typeof req.body.logoText !== 'string' || (req.body.logoText.trim() !== '' && !/^[a-z]{2}$/i.test(req.body.logoText.trim())))) return res.status(400).json({ message: 'Enter exactly two letters for the logo, or leave blank to use company initials' });
    if (req.file && !logoMime(req.file.buffer)) return res.status(400).json({ message: 'Upload a PNG, JPEG or WebP company logo up to 5 MB' });
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    const id = req.user.companyId; // validated Company Admin scope from middleware

    const editable = ['name', 'email', 'password', 'phone', 'address', 'state', 'customerName', 'logoText'];
    if(req.body.password!==undefined&&(typeof req.body.password!=='string'||req.body.password.length<8||req.body.password.length>1024))return res.status(400).json({message:'Password must have at least 8 characters'});
    const updateData = Object.fromEntries(editable.filter(key => key in req.body).map(key => [key, req.body[key]]));

    // ✅ Handle password hashing if password is being updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // ✅ Handle logo update (if a file is uploaded)
    if (req.file) {
      updateData.logo = req.file.buffer.toString("base64");
    }

    const updatedCompany = await Company.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCompany) {
      return res.status(404).json({ msg: "Company not found" });
    }

    res.status(200).json({
      msg: "Company updated successfully",
      company: updatedCompany,
    });
  } catch (err) {
    console.error("Update error:", err.message);
    res.status(500).json({ error: err.message });
  }
};



const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ $or: [{ _id: req.user.companyId }, { parentCompany: req.user.companyId }] });
    if (!companies || companies.length === 0) {
      return res.status(404).json({ msg: "No companies found" });
    }
    res.status(200).json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// const setSubscription = async (req, res) => {
//   try {
//     const { plan, bookingLimit } = req.body;
//     const companyId = req.user?.companyId; // ✅ Extract from token

//     if (!companyId) {
//       return res.status(401).json({ msg: "Unauthorized: companyId missing in token" });
//     }

//     const durationMap = {
//       monthly: 30,
//       "half-yearly": 182,
//       yearly: 365,
//     };

//     if (!durationMap[plan]) {
//       return res.status(400).json({ msg: "Invalid plan" });
//     }

//     const validTill = new Date(Date.now() + durationMap[plan] * 24 * 60 * 60 * 1000);
//     const startDate = new Date();

//     const company = await Company.findByIdAndUpdate(
//       companyId,
//       {
//         subscription: {
//           plan,
//           validTill,
//           startDate,
//         },
//         bookingLimit, // ✅ Optional and dynamic
//       },
//       { new: true }
//     );

//     if (!company) return res.status(404).json({ msg: "Company not found" });

//     res.json({
//       msg: "Subscription updated successfully",
//       subscription: company.subscription,
//       bookingLimit: company.bookingLimit,
//     });
//   } catch (err) {
//     console.error("Set Subscription Error:", err.message);
//     res.status(500).json({ error: err.message });
//   }
// };


const setSubscription = async (req, res) => {
  try {
    const { plan, bookingLimit } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ msg: "Unauthorized: companyId missing in token" });
    }

    const durationMap = {
      monthly: 30,
      "half-yearly": 182,
      yearly: 365,
    };

    if (!durationMap[plan]) {
      return res.status(400).json({ msg: "Invalid plan" });
    }

    const validTill = new Date(Date.now() + durationMap[plan] * 24 * 60 * 60 * 1000);
    const startDate = new Date();

    // 👉 Determine access based on plan
    const companyAccess = plan !== "monthly"; // only true for half-yearly and yearly

    const company = await Company.findByIdAndUpdate(
      companyId,
      {
        subscription: { plan, validTill, startDate },
        bookingLimit,
        companyAccess, // ✅ conditional value
      },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ msg: "Company not found" });
    }

    res.json({
      msg: "Subscription updated successfully",
      subscription: company.subscription,
      bookingLimit: company.bookingLimit,
      companyAccess: company.companyAccess,
    });
  } catch (err) {
    console.error("Set Subscription Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


const checkCompanyAccess = async (req, res, next) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: "Company ID missing in token" });
    }

    const company = await Company.findById(companyId).select("isBlocked");
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    if (company.isBlocked) {
      return res.status(403).json({ message: "Access denied. Company is blocked." });
    }

    return res.status(200).json({ message: "Company access granted", allowed: true });
  } catch (error) {
    console.error("Access check error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


// Get Subsidiaries
const getSubsidiaries = async (req, res) => {
  try {
    const { parentCompanyId } = req.params;
    if (parentCompanyId !== req.user.companyId) return res.status(403).json({ message: "Company access denied" });
    const subsidiaries = await Company.find({ parentCompany: parentCompanyId });
    res.json({ subsidiaries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle Project Access


const toggleProjectAccess = async (req, res) => {
  try {
    const { companyId, projectKey, enable } = req.body;

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ msg: "Company not found" });

    // Initialize 'projects' field if it's missing
    if (!company.projects) {
      company.projects = {};
    }

    // Set or update the project key
    company.projects[projectKey] = enable
      ? {
          enabled: true,
          membershipStartDate: new Date(),
          membershipEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      : {
          enabled: false,
          membershipStartDate: null,
          membershipEndDate: null
        };

    await company.save();

    res.json({
      msg: `Access to ${projectKey} ${enable ? "enabled" : "disabled"}`,
      projects: company.projects
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Delete Company
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findOneAndDelete({ _id: id, $or: [{ _id: req.user.companyId }, { parentCompany: req.user.companyId }] });
    if (!company) {
      return res.status(404).json({ msg: "Company not found" });
    }

    res.json({ msg: "Company deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check Membership Status
const checkMembershipStatus = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId);

    if (!company || !company.subscription?.validTill) {
      return res.json({ hasActiveMembership: false });
    }

    const isActive = new Date(company.subscription.validTill) > new Date();

    res.json({ hasActiveMembership: isActive });
  } catch (err) {
    res.status(500).json({ hasActiveMembership: false });
  }
};

export default {
  registerCompany,
  registerSubsidiaryCompany,
  loginCompany,
  getAllCompanies,
  getSubsidiaries,
  toggleProjectAccess,
  deleteCompany,
  setSubscription,
  checkMembershipStatus,
  updateCompany,
  checkCompanyAccess
};
