import { prepareReportPagination } from "../utils/report-pagination.js";
import express from "express";
import cfVoucherController from "../controllers/cf.voucher.controller.js";  
import auth from "../middleware/auth.middleware.js";
const router = express.Router();


router.post("/credit-voucher-generate",auth, prepareReportPagination, cfVoucherController.creditForVoucherGenerate)

router.post("/",  auth, cfVoucherController.createCFVoucher);

router.get("/",auth, cfVoucherController.getAllCFVouchers);

router.get("/:id", auth, cfVoucherController.getCFVoucherById);

router.patch("/:id", auth, cfVoucherController.updateCFVoucher);

router.delete("/:id", auth, cfVoucherController.deleteCFVoucher);

router.post("/voucher-details",  auth, prepareReportPagination, cfVoucherController.voucherDetails);

router.post("/voucher-details-print",  auth, cfVoucherController.voucherDetailsPrint);

export default router;
