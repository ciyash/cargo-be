import express from 'express'
import adminAuthController from '../controllers/admin.auth.controller.js'
import auth from "../middleware/auth.middleware.js"
import companyAuth from "../middleware/company.auth.js"

const requireAdmin = (req, res, next) => {
  if (!['company_admin','superadmin'].includes(req.user.role)) return res.status(403).json({ message: "Admin access required" });
  next();
};

const router=express.Router()
//

router.post("/delete-person", auth, requireAdmin, adminAuthController.deletePersons);

router.post("/signup-by-company", companyAuth, adminAuthController.signup);

router.post("/signup", auth, requireAdmin, adminAuthController.signup)

router.post("/login",adminAuthController.login)

router.get("/subadmins",companyAuth,adminAuthController.getAllAdmins)

router.get("/employees", auth, adminAuthController.getAllEmployees);

router.get("/profile", auth, adminAuthController.getAdminById)

router.patch("/admin-profile",auth,adminAuthController.updateAdmin)

router.patch("/update-profile/:id", auth, adminAuthController.updateAccount)
router.patch('/account-status/:id', companyAuth, adminAuthController.updateAccountStatus);

router.post("/change-password", auth, adminAuthController.changeAdminPassword)

router.post("/reset-password", auth, adminAuthController.resetPassword)

router.post("/forgot-password", auth, adminAuthController.forgotPassword)

router.delete("/delete-subadmin", auth, adminAuthController.deleteAdmin);

router.get("/branch-wise/:branchName", auth, adminAuthController.getAdminsByBranchName);

export default router
