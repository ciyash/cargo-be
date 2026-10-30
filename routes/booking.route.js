import { prepareReportPagination } from "../utils/report-pagination.js";
import express from 'express'

import auth from '../config/auth.middleware.js'

import checkCompanyAccess from '../config/company.access.js'


import bookingController from '../controllers/booking.controller.js'

 
const router=express.Router()  

//users


// router.get("/users",auth,bookingController.getAllUsers)  

router.get("/users", auth,checkCompanyAccess, bookingController.getAllUsers);

router.get("/users/search",auth,bookingController.getUsersBySearch)

router.get("/user/:senderMobile",auth,bookingController.getUserByMobile)

router.get("/user/credit",auth,bookingController.getCreditBookings)

router.delete("/user/delete-phone/:phone",auth,bookingController.deleteUserByPhone)

// bookings   
 
router.post("/",auth,bookingController.createBooking)

router.get("/",auth,bookingController.getAllBookings)

router.get("/todaybookings",auth,bookingController.toDayBookings)  

router.get("/grnNo/:grnNo",auth,bookingController.getBookingByGrnNo)

router.get("/adminUniqueId/:adminUniqueId",auth,bookingController.getBookingadminUniqueId)

router.post("/search-data", auth,bookingController.getBookingsByAnyField);
 
router.get("/pages",auth,bookingController.getAllBookingsPages)

router.get("/fromCity/:fromCity/toCity/:toCity/:vehicalNumber",auth,bookingController.getBookingsfromCityTotoCity)

router.post("/get-lrNumber",auth,bookingController.getBookinglrNumber)

router.delete("/:id",auth,bookingController.deleteBookings)

router.patch("/:id",auth,bookingController.updateBookings)

router.patch("/grnNo/:grnNo",auth,bookingController.updateGRNBookings)

router.post("/updateAllGrnNumbers",auth,bookingController.updateAllGrnNumbers)

// router.post("/unreceived-booking",auth,bookingController.unReceivedBookings)

//   

router.post("/delivery-booking",auth,bookingController.deliveryBooking)

router.get("/get-deliveries",auth,bookingController.getAllDeliveries)

router.patch("/update/:id",auth,bookingController.updateDelivery)

router.post("/cancelBooking/:grnNo",auth,bookingController.cancelBooking)   

router.post("/markParcelAsMissing/:grnNo", auth, bookingController.markParcelAsMissing) // Mark parcel as missing

router.post("/delivery-report", auth, prepareReportPagination, bookingController.deliveryReport) // Delivery report
// reports

router.post("/parcel-booking-report",auth,prepareReportPagination, bookingController.parcelBookingReports)
router.post("/all-parcel-booking-report",auth,prepareReportPagination, bookingController.allParcelBookingReport)
router.post("/parcel-report-serialNo",auth,prepareReportPagination, bookingController.parcelReportSerialNo) 
router.post('/parcel-cancel-report',auth,prepareReportPagination, bookingController.parcelCancelReport)
router.post("/parcel-booking-summary-report",auth,prepareReportPagination, bookingController.parcelBookingSummaryReport)
router.post("/parcel-booking-mobileNumber",auth,prepareReportPagination, bookingController.parcelBookingMobileNumber)
router.post("/regular-customer-booking",auth,prepareReportPagination, bookingController.regularCustomerBooking)
  
router.post("/branch-Wise-collection-report",auth,prepareReportPagination, bookingController.branchWiseCollectionReport)
router.post("/collection-summary-report",auth,prepareReportPagination, bookingController.collectionforSummaryReport)
router.post("/collection-toPay-report",auth,prepareReportPagination, bookingController.collectionReportToPay)
router.post("/all-collection-report",auth,prepareReportPagination, bookingController.allCollectionReport)
router.post("/booking-typew-ise-collection",auth,prepareReportPagination, bookingController.bookingTypeWiseCollection)


router.post("/parcel-branch-consolidated-report",auth,prepareReportPagination, bookingController.parcelBranchConsolidatedReport)
router.post("/consolidated-report-branch",auth,prepareReportPagination, bookingController.consolidatedReportBranch)
router.post("/parcel-branch-wise-gst-report",auth,prepareReportPagination,bookingController.parcelBranchWiseGSTReport)
router.post("/sender-receiver-gst-report",auth,prepareReportPagination, bookingController.senderReceiverGSTReport)
router.post("/pending-delivery-stock-report",auth,prepareReportPagination, bookingController.pendingDeliveryStockReport) //sudheer
router.post("/parcel-status-date-difference-report",auth,prepareReportPagination, bookingController.parcelStatusDateDifferenceReport)
router.post("/pending-delivery-luggage-report",auth,prepareReportPagination, bookingController.pendingDeliveryLuggageReport)
router.post("/parcel-received-stock-report",auth,prepareReportPagination, bookingController.parcelReceivedStockReport)
router.post("/delivered-stock-report",auth,prepareReportPagination, bookingController.deliveredStockReport)
router.post("/pending-dispatch-stock-report",auth,prepareReportPagination, bookingController.pendingDispatchStockReport)
router.post("/dispatched-memo-report",auth,prepareReportPagination, bookingController.dispatchedMemoReport)
router.post("/parcel-incoming-luggages-report",auth,prepareReportPagination, bookingController.parcelIncomingLuggagesReport)
router.post("/grnNolrNo",auth, bookingController.getBookingByGrnOrLrNumber);

//dashboard booking

router.get("/get-above700",auth,bookingController.getAllBookingsAbove700)
router.post("/sales-summary-branchwise",auth,prepareReportPagination, bookingController.salesSummaryByBranchWise)
router.post("/summary-report",auth,prepareReportPagination, bookingController.collectionSummaryReport)
router.post("/branch-account",auth,prepareReportPagination, bookingController.branchAccount)
router.post("/acparty-account",auth,prepareReportPagination, bookingController.acPartyAccount)
router.get("/status-wise-summary",auth,prepareReportPagination, bookingController.statusWiseSummary)

router.get("/get-total",auth,bookingController.getTotalByBranchAndDate)

export default router
  

