import Admin from "../models/admin.auth.model.js";
import { escapeRegex } from "../utils/api-error.js";
import Branch from "../models/branch.model.js";
import { resolveBranchCity } from '../services/company-cities.js';
import { sendError } from '../utils/api-error.js';
import { phoneNumber } from '../utils/phone.js';

// Function to generate uniqueId id
const generateUniqueId = (city, name) => {
  const cityCode = city.substring(0, 2).toUpperCase();
  const nameCode = name.substring(0, 2).toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${cityCode}${nameCode}${randomNum}`;
};

const createBranch = async (req, res) => {
  try {
    if(!['company','company_admin','superadmin'].includes(req.user?.role))return res.status(403).json({message:'Only company admins can create branches'});
    // Get companyId from logged in user
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company ID not found in user session",
      });
    }

    req.body={...req.body,...await resolveBranchCity(companyId,req.body)};
    for(const key of ['phone','alternateMobile'])if(req.body[key]!==undefined&&req.body[key]!==null&&req.body[key]!=='')phoneNumber(req.body[key],key,req.body.country?.toLowerCase()!=='india');
    const {
      name,
      openingBalance,
      branchType,
      city,
      cityId,
      location,
      branchDate,
      branchStatus,
      address,
      phone,
      pincode,
      state,
      country,
      alternateMobile,
    } = req.body;

    if (
      !name || !branchType || !city || !location || !address ||
      !phone || !pincode || !state || !country
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing!",
      });
    }

    // Check main branch existence for the user's company + city
    if (branchType === "main") {
      const existingMain = await Branch.findOne({ companyId, city, branchType: "main" });
      if (existingMain) {
        return res.status(400).json({
          success: false,
          message: "Main branch already exists in this city for your company",
        });
      }
    }

    const branchUniqueId = generateUniqueId(city, name);
    const ownershipType=req.body.ownershipType||'own';
    if(!['own','franchise'].includes(ownershipType))return res.status(400).json({message:'Invalid branch ownership type'});
    const servicePostalCodes=req.body.servicePostalCodes||[];
    if(!Array.isArray(servicePostalCodes)||servicePostalCodes.length>10000||servicePostalCodes.some(v=>typeof v!=='string'||!v.trim()||v.length>20))return res.status(400).json({message:'Service postal codes must be an array of valid codes'});
    const createdBy = req.user.id;

    const newBranch = new Branch({
      ownershipType, servicePostalCodes,
      courierPickupLocation:String(req.body.courierPickupLocation||'').slice(0,150),
      delhiveryPickupLocation:String(req.body.delhiveryPickupLocation||'').trim().slice(0,150),
      branchUniqueId,
      openingBalance,
      createdBy,
      createdByCompany: req.user.id ? undefined : companyId,
      name,
      branchType,
      city,
      cityId,
      location,
      branchDate,
      branchStatus,
      address,
      phone,
      pincode,
      state,
      country,
      alternateMobile,
      companyId,  // from logged-in user
    });

    await newBranch.save();
    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: newBranch,
    });
  } catch (error) {
    return sendError(res,error);
  }
};


const getAllBranches = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company ID not found in user session",
      });
    }

    const branches = await Branch.find({ companyId });
    if ( branches.length === 0) {
      return res.status(404).json({ message: "No branches found" });
    }

    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBranchByUniqueId = async (req, res) => {
  try {
    const { branchUniqueId } = req.params;
    const companyId = req.user.companyId;

    const query = { branchUniqueId };
    if (companyId) query.companyId = companyId;

    const branch = await Branch.findOne(query).populate("createdBy", "name location");

    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }
    res.status(200).json(branch);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getbranchId = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findOne({ _id: id, companyId: req.user.companyId });

    if (!branch) {
      return res.status(404).json({ message: "Branch ID not found!" });
    }
    res.status(200).json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBranch = async (req, res) => {
  try {
    if(!['company','company_admin','superadmin'].includes(req.user?.role))return res.status(403).json({message:'Company admin access required'});
    const { id } = req.params;

    // Optionally, you could validate companyId here if you want strict company control
    if(['cityId','city','state','country'].some(key=>key in req.body)){
      if(!req.body.cityId&&!req.body.city)return res.status(400).json({message:'Select a registered city to change branch city, state or country'});
      req.body={...req.body,...await resolveBranchCity(req.user.companyId,req.body)};
    }
    const allowed = ['name', 'openingBalance', 'branchType', 'city', 'cityId', 'location', 'branchDate', 'branchStatus', 'address', 'phone', 'pincode', 'state', 'country', 'alternateMobile','servicePostalCodes','courierPickupLocation','delhiveryPickupLocation'];
    if(['phone','alternateMobile'].some(key=>req.body[key]!==undefined)){
      const existing=await Branch.findOne({_id:id,companyId:req.user.companyId}).lean();
      if(!existing)return res.status(404).json({message:'Branch not found'});
      const country=req.body.country||existing.country||'India';
      for(const key of ['phone','alternateMobile'])if(req.body[key]!==undefined&&req.body[key]!==null&&req.body[key]!=='')phoneNumber(req.body[key],key,country.toLowerCase()!=='india');
    }
    const updates = Object.fromEntries(allowed.filter(key => key in req.body).map(key => [key, req.body[key]]));
    const updatedBranch = await Branch.findOneAndUpdate({ _id: id, companyId: req.user.companyId }, { $set: updates }, { new: true, runValidators: true });

    if (!updatedBranch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      data: updatedBranch,
    });
  } catch (error) {
    return sendError(res,error);
  }
};

const deleteBranch = async (req,res) => res.status(409).json({message:'Branches with operational history must be archived, not deleted. Contact the company admin.'});

const getBranchByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const companyId = req.user.companyId;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Start date and end date are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    end.setHours(23, 59, 59, 999);

    const query = {
      branchDate: { $gte: start, $lte: end },
    };
    if (companyId) {
      query.companyId = companyId;
    }

    const branches = await Branch.find(query);
    if (branches.length === 0) {
      return res.status(404).json({ success: false, message: "No branches found in this date range" });
    }

    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getBranchByAdminUniqueId = async (req, res) => {
  try {
    const { subadminUniqueId } = req.params;

    const admin = await Admin.findOne({ companyId: req.user.companyId, subadminUniqueId }).select('_id').lean();
    const matchedBranch = admin ? await Branch.findOne({ companyId: req.user.companyId, createdBy: admin._id }).populate('createdBy', 'subadminUniqueId name') : null;

    if (!matchedBranch) {
      return res.status(404).json({ message: "Admin not found or no branch assigned!" });
    }

    res.status(200).json(matchedBranch);
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



const getBranchCity = async (req, res) => {
  try {
    const { city } = req.params;
    const companyId = req.user?.companyId || req.query.companyId;

    if (!city) {
      return res.status(400).json({ message: "City is required in params." });
    }

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required." });
    }

    // Build query with case-insensitive city match
    const query = {
      city: { $regex: new RegExp(`^${escapeRegex(city)}$`, "i") },
      companyId,
    };

    const branches = await Branch.find(query);

    if (!branches.length) {
      return res.status(404).json({ message: "City not found for this company." });
    }

    const responseData = branches.map(branch => ({
      _id: branch._id,
      city: branch.city,
      name: branch.name,
      branchType: branch.branchType,
      branchUniqueId: branch.branchUniqueId,
    }));

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in getBranchCity:", error);
    return res.status(500).json({ error: error.message });
  }
};

export default {
  createBranch,
  getAllBranches,
  getBranchByUniqueId,
  getbranchId,
  updateBranch,
  deleteBranch,
  getBranchByDateRange,
  getBranchByAdminUniqueId,
  getBranchCity,
};
