import express from "express";
import branchReportController from "../controllers/branch.report.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

// Snapshot
router.get('/:branchCode/live-snapshot', auth, branchReportController.getLiveBranchSnapshot);

// Live status
router.get('/:branchCode/live-status', auth, branchReportController.getLiveStatus);

export default router;
