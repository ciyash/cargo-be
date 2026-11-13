import { prepareReportPagination } from "../utils/report-pagination.js";
import express from 'express'
import parcelController from "../controllers/parcel.loading.controller.js"
import auth from "../middleware/auth.middleware.js"

const router=express.Router()   

router.post("/parcel-loding-load" ,auth,prepareReportPagination, parcelController.getBookingsBetweenDates);

router.post("/",auth,parcelController.createParcel)
 
router.get("/",auth,parcelController.getAllParcels)

router.get("/:id",auth,parcelController.getParcelById)   

router.get("/vocherNoUnique/:vocherNoUnique",auth,parcelController.getParcelVocherNoUnique)

router.get("/voucher-details-print/:vocherNoUnique",auth,parcelController.offlineParcelVoucherDetailsPrint)

router.patch("/:id",auth,parcelController.updateParcel)

router.delete("/:id",auth,parcelController.deleteParcel)

router.post("/updateGrnNumbers",auth,parcelController.updateAllGrnNumbers)

router.post("/get-lrNumber",auth,parcelController.getParcelByLrNumber)

router.get("/grnNo/:grnNo",auth,parcelController.getParcelByGrnNo)

router.get("/vehicalNumber/:vehicalNumber",auth,parcelController.getParcelByVehicalNumber)

router.post("/offline-parcel-voucher-details",auth,prepareReportPagination, parcelController.offlineParcelVoucherDetails)

router.post("/parcel-offline-report",auth,prepareReportPagination, parcelController.parcelOfflineReport) // parcel offline report

router.post("/parcel-status-report",auth,prepareReportPagination, parcelController.parcelStatusReport)  //parcel status date difference report

router.post("/parcel-pending-report",auth, prepareReportPagination, parcelController.parcelPendingReport)  // parcel pending delivery stockreport

router.post("/branch-to-branch-load",auth,prepareReportPagination, parcelController.getBookingsByDateAndBranch) //branch to branch loading

router.post("/branch-to-branch-post",auth,parcelController.createBranchToBranch)  // branch to branch post



// reports

router.post("/dispatched-stock-report",auth,prepareReportPagination, parcelController.dispatchedStockReport)



export default router    