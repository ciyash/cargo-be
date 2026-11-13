import express from "express";
import branchController from '../controllers/branch.controller.js'
import auth from "../middleware/auth.middleware.js"
const router = express.Router();

router.post("/", auth,branchController.createBranch); 
router.get("/", auth, branchController.getAllBranches); 
router.get("/branchUniqueId/:branchUniqueId", auth, branchController.getBranchByUniqueId); 
router.get("/subadminUniqueId/:subadminUniqueId", auth, branchController.getBranchByAdminUniqueId);
router.post("/dateRange", auth, branchController.getBranchByDateRange);
router.get("/:id", auth, branchController.getbranchId);
router.patch("/update/:id", auth, branchController.updateBranch); 
router.delete("/delete/:id", auth, branchController.deleteBranch);
router.get("/city/:city", auth, branchController.getBranchCity);

export default router;
