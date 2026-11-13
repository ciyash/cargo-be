import express from "express";
import companyController from '../controllers/company.controller.js';
import companyAuth from "../middleware/company.auth.js";
import multer from 'multer';
import { domesticPhoneFields } from '../utils/phone.js';
import branchController from '../controllers/branch.controller.js';
import { getCompanyBranding } from '../controllers/company-branding.controller.js';

const router = express.Router();
router.get('/branding', companyAuth, (req, res, next) => { req.params.companyId = req.user.companyId; return getCompanyBranding(req, res, next); });


const storage=multer.memoryStorage()

const upload=multer({storage, limits: { fileSize: 5 * 1024 * 1024, fields: 30, files: 1 }}).single("logo")

router.post("/register", upload, domesticPhoneFields, companyController.registerCompany);
router.post("/login", companyController.loginCompany);
router.get("/branches", companyAuth, branchController.getAllBranches);
router.post("/branches", companyAuth, branchController.createBranch);


router.post("/subsidiary/register", upload,domesticPhoneFields,companyController.registerSubsidiaryCompany);

router.post("/subsidiary/login", companyController.loginCompany);

router.post("/company-access", companyAuth, companyController.checkCompanyAccess); // Check if company has access to a project

router.get("/get-companies", companyAuth, companyController.getAllCompanies);    // Get all companies

router.patch("/update", companyAuth, upload, domesticPhoneFields, companyController.updateCompany); // Update company details

router.get("/subsidiaries/:parentCompanyId", companyAuth, companyController.getSubsidiaries);

// router.post("/toggle-project", companyController.toggleProjectAccess);

router.delete("/delete/:id",companyAuth, companyController.deleteCompany);

router.post("/subscription", companyAuth, (req, res) => res.status(410).json({ message: 'Use verified Razorpay payment to activate a subscription.' }));

router.get("/check/membership/:companyId", companyController.checkMembershipStatus);

export default router;
