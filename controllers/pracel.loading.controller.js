import { sendReport, sendEmptyReport, queryReportPage, sendReportPage, getReportPagination } from "../utils/report-pagination.js";
import { writableFields } from "../utils/update-fields.js";
import { recordParcel } from "../services/parcel-workflow.js";
import { sendError, escapeRegex, dateRange } from "../utils/api-error.js";
import ParcelLoading from "../models/pracel.loading.model.js";
import { Booking } from "../models/booking.model.js";
import CFMaster from "../models/cf.master.model.js";
const generateVocherNoUnique = () => {
  return Math.floor(100000 + Math.random() * 900000);
};


// const getBookingsBetweenDates = async (req, res) => {
//   try {
//     const companyId = req.user?.companyId;
//     const { startDate, endDate, fromCity, toCity, pickUpBranch } = req.body;

//     if (!startDate || !endDate) {
//       return res.status(400).json({ message: "Start date and end date are required!" });
//     }

//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     start.setHours(0, 0, 0, 0);
//     end.setHours(23, 59, 59, 999);

//     // Step 1: Base filter
//     const filter = {
//       companyId,
//       bookingDate: range,
//       bookingStatus: 0,
//       agent: "", // Only user bookings
//     };

//     // Step 2: Optional filters
//     if (fromCity) {
//       filter.fromCity = new RegExp(`^${escapeRegex(fromCity)}$`, "i");
//     }

//     if (Array.isArray(toCity) && toCity.length > 0) {
//       filter.toCity = {
//         $in: toCity.map((city) => new RegExp(`^${escapeRegex(city)}$`, "i")),
//       };
//     } else if (toCity) {
//       filter.toCity = new RegExp(`^${escapeRegex(toCity)}$`, "i");
//     }

//     if (pickUpBranch) {
//       filter.pickUpBranch = pickUpBranch;
//     }

//     // Step 3: Query bookings
//     const bookings = await Booking.find(filter).lean();

//     if (bookings.length === 0) {
//       return res.status(404).json({
//         message: "No parcels found for the given filters!",
//       });
//     }

//     // Step 4: Extract senderNames from bookings
//     const senderNames = bookings
//       .map((b) => b.senderName?.trim())
//       .filter(Boolean);

//     // Step 5: Check which senders are in CFMaster (i.e. companies)
//     const cfSenders = await CFMaster.find({
//       companyId,
//       name: { $in: senderNames },
//     }).select("name");

//     const companyNames = cfSenders.map((cf) => cf.name.trim());

//     // Step 6: Exclude bookings made by companies
//     const userBookings = bookings.filter(
//       (b) => !companyNames.includes(b.senderName?.trim())
//     );

//     // Step 7: Respond with user bookings
//     res.status(200).json(userBookings);
//   } catch (error) {
//     console.error("Error fetching bookings:", error);
//     return sendError(res, error);
//   }
// };

const getBookingsBetweenDates = async (req, res) => {
  let databasePagination;
  const report = payload => sendReportPage(res, payload, databasePagination);
  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, fromCity, toCity, pickUpBranch } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required!" });
    }

    const range = dateRange(startDate, endDate);

    // Step 1: Build filter
    const filter = {
      companyId,
      bookingDate: { $gte: start, $lte: end },
      bookingStatus: 0,
    };

    // Step 2: Optional filters
    if (fromCity) {
      filter.fromCity = new RegExp(`^${escapeRegex(fromCity)}$`, "i");
    }

    if (Array.isArray(toCity) && toCity.length > 0) {
      filter.toCity = {
        $in: toCity.map((city) => new RegExp(`^${escapeRegex(city)}$`, "i")),
      };
    } else if (toCity) {
      filter.toCity = new RegExp(`^${escapeRegex(toCity)}$`, "i");
    }

    if (pickUpBranch) {
      filter.pickUpBranch = pickUpBranch;
    }

    // Step 3: Get bookings directly
    const page = await queryReportPage(Booking.find(filter).sort({ _id: 1 }), req);
    const bookings = page.rows;
    databasePagination = page.pagination;

    if (!page.totals.totalRecords) {
      return sendEmptyReport(req, res, {
        message: "No parcels found for the given filters!",
      });
    }

    // Step 4: Return all filtered bookings (CFMaster check removed)
    report(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getParcelByGrnNo = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { grnNo } = req.params;

    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing" });
    }

    if (!grnNo) {
      return res.status(400).json({ message: "grnNo is required" });
    }

    const booking = await Booking.findOne({ grnNo, bookingStatus: 0, companyId });

    if (!booking) {
      return res.status(404).json({
        message: "No booking found for the given GRN number with bookingStatus 0.",
      });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error("Error in getParcelByGrnNo:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const createParcel = async (req, res) => {
  try {
    const { parcel } = await recordParcel(req.body, req.user, { branchTransfer: false });
    return res.status(201).json({ message: 'Parcel created successfully and bookings updated', parcel });
  } catch (error) { return sendError(res, error); }
};
const createBranchToBranch = async (req, res) => {
  try {
    const { parcel } = await recordParcel(req.body, req.user, { branchTransfer: true });
    return res.status(201).json({ message: 'Parcel created successfully and bookings updated', parcel });
  } catch (error) { return sendError(res, error); }
};

const getAllParcels = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const parcels = await ParcelLoading.find({ companyId }).lean();
    if (parcels.length === 0) {
      return res.status(400).json({ message: "no parcels found !" });
    }
    res.status(200).json(parcels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getParcelVocherNoUnique = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { vocherNoUnique } = req.params;

    if (!companyId || !vocherNoUnique) {
      return res.status(400).json({ message: "Company ID or Vocher number missing" });
    }

    // Step 1: Find the parcel
    const parcel = await ParcelLoading.findOne({ vocherNoUnique, companyId });

    if (!parcel) {
      return res.status(404).json({ message: "No parcel found with this voucher number" });
    }

    const grnNos = parcel.grnNo || [];

    if (!grnNos.length) {
      return res.status(404).json({ message: "No GRNs linked to this parcel" });
    }

    // Step 2: Fetch bookings by GRN numbers
    const bookings = await Booking.find({
      grnNo: { $in: grnNos },
      companyId,
    });

    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found for the GRN numbers" });
    }

    // Step 3: Format booking data
    const formattedBookings = bookings.map((booking, index) => ({
      no: index + 1,
      grnNo: booking.grnNo,
      lrNumber: booking.lrNumber,
      sender: booking.senderName,
      receiver: booking.receiverName,
      fromCity: booking.fromCity,
      toCity: booking.toCity,
      payType: booking.bookingType,
      status: booking.bookingStatus,
      tranDate: booking.loadingDate
        ? new Date(booking.loadingDate).toLocaleDateString("en-GB")
        : null,
      amount: booking.grandTotal || 0,
    }));

    // Step 4: Send response
    res.status(200).json({
      vocherNo: vocherNoUnique,
      bookingList: formattedBookings,
    });
  } catch (error) {
    console.error("Error fetching parcel voucher:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


const getParcelById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing" });
    }

    if (!id) {
      return res.status(400).json({ message: "Parcel ID is required" });
    }

    const parcel = await ParcelLoading.findOne({ _id: id, companyId })
      .lean();

    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }

    res.status(200).json(parcel);
  } catch (error) {
    console.error("Error in getParcelById:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


const updateParcel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing" });
    }

    if (!id) {
      return res.status(400).json({ message: "Parcel ID is required" });
    }

    // Only update if the parcel belongs to the same company
    const updatedParcel = await ParcelLoading.findOneAndUpdate(
      { _id: id, companyId },
      { $set: writableFields(req.body) },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedParcel) {
      return res.status(404).json({ message: "Parcel not found or unauthorized access" });
    }

    res.status(200).json({ message: "Parcel updated successfully", parcel: updatedParcel });
  } catch (error) {
    console.error("Error updating parcel:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const deleteParcel = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing" });
    }

    if (!id) {
      return res.status(400).json({ message: "Parcel ID is required" });
    }

    // Only delete if the parcel belongs to the current company
    const deletedParcel = await ParcelLoading.findOneAndDelete({ _id: id, companyId });

    if (!deletedParcel) {
      return res.status(404).json({ message: "Parcel not found or unauthorized access" });
    }

    res.status(200).json({ message: "Parcel deleted successfully" });
  } catch (error) {
    console.error("Error deleting parcel:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const parcelOfflineReport = async (req, res) => {
  let databasePagination;
  const report = payload => sendReportPage(res, payload, databasePagination);
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing" });
    }

    const { fromDate, toDate, fromCity, toCity, fromBranch } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "fromDate and toDate are required!" });
    }

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: "Invalid date format!" });
    }

    // Step 1: Build filter
    const filter = {
      companyId,
      loadingDate: { $gte: startDate, $lte: endDate },
    };

    if (fromCity) filter.fromCity = new RegExp(`^${escapeRegex(fromCity)}$`, "i");

    if (Array.isArray(toCity) && toCity.length > 0) {
      filter.toCity = { $in: toCity.map(city => new RegExp(`^${escapeRegex(city)}$`, "i")) };
    } else if (typeof toCity === "string" && toCity.trim()) {
      filter.toCity = new RegExp(`^${escapeRegex(toCity)}$`, "i");
    }

    if (fromBranch) filter.fromBranch = fromBranch;

    // Step 2: Get ParcelLoading data
    const parcelLoadings = await ParcelLoading.find(filter, { grnNo: 1 }).sort({ _id: 1 }).lean();

    if (!parcelLoadings.length) {
      return sendEmptyReport(req, res, { message: "No parcel loadings found in given criteria." });
    }

    // Step 3: Extract GRNs
    const grnNoList = parcelLoadings.flatMap(p => p.grnNo).filter(Boolean);

    if (!grnNoList.length) {
      return sendEmptyReport(req, res, { message: "No GRN numbers found in parcel loadings." });
    }

    // Step 4: Fetch bookings based on GRN numbers
    const page = await queryReportPage(Booking.find({
      grnNo: { $in: grnNoList },
      companyId
    })
      .sort({ createdAt: -1, _id: -1 })
      .lean(), req);
    const bookings = page.rows;
    databasePagination = page.pagination;

    if (!page.totals.totalRecords) {
      return sendEmptyReport(req, res, { message: "No bookings found for the matched GRN numbers." });
    }

    report({
      count: page.totals.totalRecords,
      data: bookings,
    });

  } catch (error) {
    console.error("Error in parcelOfflineReport:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


const updateAllGrnNumbers = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ message: "Company ID missing" });

    const { grnNumbers, updateFields } = req.body;

    if (!grnNumbers || !Array.isArray(grnNumbers) || grnNumbers.length === 0) {
      return res.status(400).json({ message: "Invalid or missing grnNumbers array" });
    }

    if (
      !updateFields ||
      typeof updateFields !== "object" ||
      Object.keys(updateFields).length === 0
    ) {
      return res.status(400).json({ message: "Invalid or missing updateFields object" });
    }

    // Add updatedAt timestamp
    const safeUpdates = writableFields(updateFields);
    safeUpdates.updatedAt = new Date();

    // Prepare query filter with companyId for security if applicable
    const filter = {
      grnNo: { $in: grnNumbers },
    };
    if (companyId) {
      filter.companyId = companyId;
    }

    // Find all bookings before update
    const beforeUpdate = await Booking.find(filter);

    // Update all matched bookings
    const updateResult = await Booking.updateMany(filter, { $set: safeUpdates });

    // Fetch all updated records
    const afterUpdate = await Booking.find(filter);

    return res.status(200).json({
      message: `Successfully updated ${updateResult.modifiedCount} records`,
      beforeUpdate,
      afterUpdate,
    });
  } catch (error) {
    console.error("Error updating GRN numbers:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


const getParcelByLrNumber = async (req, res) => {
  try {
    let { lrNumber } = req.body;

    if (!lrNumber) {
      return res.status(400).json({ message: "lrNumber is required" });
    }

    // Normalize lrNumber to array
    if (!Array.isArray(lrNumber)) {
      lrNumber = [lrNumber];
    }

    // Optional: Trim each lrNumber string
    lrNumber = lrNumber.map((lr) => lr.trim());

    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ message: "Company ID missing" });
    const filter = { lrNumber: { $in: lrNumber } };

    if (companyId) {
      filter.companyId = companyId;
    }

    // Fetch parcels and bookings in parallel
    const [parcels, bookings] = await Promise.all([
      ParcelLoading.find(filter),
      Booking.find(filter),
    ]);

    if (parcels.length === 0 && bookings.length === 0) {
      return res.status(404).json({ message: "No matching data found" });
    }

    res.status(200).json({ parcels, bookings });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getParcelByVehicalNumber = async (req, res) => {
  try {
    let { vehicalNumber } = req.params;

    if (!vehicalNumber || !vehicalNumber.trim()) {
      return res.status(400).json({ success: false, message: "vehicalNumber is required" });
    }

    vehicalNumber = vehicalNumber.trim();
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized: companyId missing" });
    }

    const filter = { vehicalNumber, companyId };

    const parcels = await ParcelLoading.find(filter).sort({ loadingDate: -1 });

    if (!parcels.length) {
      return res.status(404).json({ success: false, message: "No parcels found for the given vehicalNumber" });
    }

    res.status(200).json({
      success: true,
      count: parcels.length,
      data: parcels,
    });
  } catch (error) {
    console.error("Error fetching parcels by vehicalNumber:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


const parcelStatusReport = async (req, res) => {
  let databasePagination;
  const report = payload => sendReportPage(res, payload, databasePagination);
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Company ID missing" });
    }

    const { startDate, endDate, fromCity, toCity, parcelStatus } = req.body;

    if (!startDate || !endDate || !fromCity || !toCity || parcelStatus === undefined) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    // Build the query with companyId filtering
    const page = await queryReportPage(ParcelLoading.find({
      fromCity,
      toCity,
      parcelStatus,
      companyId,
      loadingDate: { $gte: start, $lte: end }, // Adjust if you use a different date field
    }).sort({ _id: 1 }), req);
    const parcels = page.rows;
    databasePagination = page.pagination;

    if (!page.totals.totalRecords) {
      return sendEmptyReport(req, res, { success: false, message: "No parcels found" });
    }

    report({ success: true, count: page.totals.totalRecords, data: parcels });
  } catch (error) {
    console.error("Error in parcelStatusReport:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const parcelPendingReport = async (req, res) => {
  let databasePagination;
  const report = payload => sendReportPage(res, payload, databasePagination);
  try {

      const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company ID missing",
      });
    }

    let { fromCity, toCity, fromBranch, toBranch } = req.body;

    // Check required fields
    if (!fromCity || !toCity || !fromBranch || !toBranch) {
      return res.status(400).json({
        success: false,
        message: "fromCity, toCity, fromBranch, and toBranch are required",
      });
    }

    // Company check
    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company ID missing",
      });
    }

    // Normalize inputs
    fromCity = fromCity.trim().toLowerCase();
    toCity = toCity.trim().toLowerCase();
    fromBranch = fromBranch.trim().toLowerCase();
    toBranch = toBranch.trim().toLowerCase();

    // Query pending parcels
    const page = await queryReportPage(ParcelLoading.find({
      companyId,
      fromCity,
      toCity,
      fromBranch,
      toBranch,
      parcelStatus: 0, // Assuming 0 means pending
    }).sort({ _id: 1 }), req);
    const pendingParcels = page.rows;
    databasePagination = page.pagination;

    if (page.totals.totalRecords === 0) {
      return sendEmptyReport(req, res, {
        success: false,
        message: "No pending parcels found for the specified criteria",
      });
    }

    report({
      success: true,
      count: page.totals.totalRecords,
      data: pendingParcels,
    });
  } catch (error) {
    console.error("Error in parcelPendingReport:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getBookingsByDateAndBranch = async (req, res) => {
  let databasePagination;
  const report = payload => sendReportPage(res, payload, databasePagination);
  try {
    const { fromBookingDate, toBookingDate, fromBranch } = req.body;
    const { companyId } = req.user || {};

    if (!fromBookingDate || !toBookingDate || !fromBranch) {
      return res.status(400).json({
        message: "fromBookingDate, toBookingDate, and fromBranch are required",
      });
    }

    if (!companyId) {
      return res.status(401).json({
        message: "Unauthorized: Company ID missing",
      });
    }

    const from = new Date(fromBookingDate);
    const to = new Date(toBookingDate);
    to.setHours(23, 59, 59, 999); // Include entire day

    const page = await queryReportPage(Booking.find({
      companyId,
      bookingDate: { $gte: from, $lte: to },
      pickUpBranch: fromBranch,
       bookingStatus: 0,
    }).sort({ bookingDate: -1, _id: -1 }), req);
    const bookings = page.rows;
    databasePagination = page.pagination;

    if (!page.totals.totalRecords) {
      return report({ message: "No parcels available" });
    }

    return report(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};


const offlineParcelVoucherDetailsPrint = async (req, res) => {
  try {
    const { companyId } = req.user || {};
    const vocherNoUnique = req.params.vocherNoUnique?.trim();

    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing" });
    }

    if (!vocherNoUnique) {
      return res.status(400).json({ message: "vocherNoUnique is required" });
    }

    const parcel = await ParcelLoading.findOne({ vocherNoUnique, companyId });

    if (!parcel) {
      return res.status(404).json({ message: "Data not found in parcels!" });
    }

    const grnNos = parcel.grnNo || [];

    const bookings = await Booking.find(
      { grnNo: { $in: grnNos }, companyId },
      {
        fromCity: 1,
        grnNo: 1,
        lrNumber: 1,
        pickUpBranchname: 1,
        toCity: 1,
        dropBranchname: 1,
        senderName: 1,
        totalQuantity: 1,
        receiverName: 1,
        senderMobile: 1,
        bookingDate: 1,
        receiverMobile: 1,
        bookingType: 1,
        vehicalNumber: 1,
        driverName: 1,
        grandTotal: 1,
        packages: 1,
        _id: 0,
      }
    );

    let allTotal = 0;
    let allQuantity = 0;

    const bookingTypeSummary = {
      paid: { totalBookings: 0, grandTotal: 0 },
      toPay: { totalBookings: 0, grandTotal: 0 },
      credit: { totalBookings: 0, grandTotal: 0 },
      FOC: { totalBookings: 0, grandTotal: 0 },
    };

    const formattedBookings = bookings.map((booking) => {
      const bookingTotal = Number(booking.grandTotal) || 0;
      const bookingQty = Number(booking.totalQuantity) || 0;

      allTotal += bookingTotal;
      allQuantity += bookingQty;

      const type = booking.bookingType;

      if (bookingTypeSummary[type]) {
        bookingTypeSummary[type].totalBookings += 1;
        bookingTypeSummary[type].grandTotal += bookingTotal;
      }

      return {
        grnNo: booking.grnNo,
        lrNumber: booking.lrNumber,
        fromCity: booking.fromCity,
        pickUpBranchname: booking.pickUpBranchname,
        toCity: booking.toCity,
        dropBranchname: booking.dropBranchname,
        Sender: booking.senderName,
        Receiver: booking.receiverName,
        senderMobile: booking.senderMobile,
        receiverMobile: booking.receiverMobile,
        Amount: booking.grandTotal,
        bookingType: booking.bookingType,
        bookingDate: booking.bookingDate,
        BusNo: booking.vehicalNumber,
        driverName: booking.driverName,
        totalQuantity: booking.totalQuantity,
        packages: (booking.packages || []).map((pkg) => ({
          packageType: pkg.packageType,
          quantity: pkg.quantity,
          contains: pkg.contains,
        })),
      };
    });

    res.status(200).json({
      bookings: formattedBookings,
      allTotal,
      allQuantity,
      bookingTypeSummary,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const offlineParcelVoucherDetails = async (req, res) => {
  const report = payload => sendReport(req, res, payload, 'offlineParcelVoucherDetails');
  try {
    const { companyId } = req.user || {};
    const { fromDate, toDate, vehicalNumber, fromCity, toCity, fromBranch } = req.body;

    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing" });
    }

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "fromBookingDate and toBookingDate are required!" });
    }

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: "Invalid date format!" });
    }
    endDate.setHours(23, 59, 59, 999);

    const filter = {
      companyId,
      loadingDate: { $gte: startDate, $lte: endDate },
    };

    // ✅ Apply filters using case-insensitive regex
    if (vehicalNumber) filter.vehicalNumber = vehicalNumber;
    if (fromCity) filter.fromCity = { $regex: `^${escapeRegex(fromCity)}$`, $options: "i" };
    if (toCity) filter.toCity = { $regex: `^${escapeRegex(toCity)}$`, $options: "i" };
    if (fromBranch) filter.fromBranch = { $regex: `^${escapeRegex(fromBranch)}$`, $options: "i" };

    const parcels = await ParcelLoading.find(filter).sort({ loadingDate: -1, _id: -1 }).lean();

    if (!parcels.length) {
      return sendEmptyReport(req, res, { message: "No parcels found in the given date range!" });
    }

    const grnNos = [...new Set(parcels.flatMap((parcel) => parcel.grnNo || []))];
    const bookings = await Booking.find({ grnNo: { $in: grnNos }, companyId }).sort({ _id: 1 }).lean();
    const bookingsByGrn = new Map(bookings.map(booking => [booking.grnNo, booking]));

    const result = parcels.map((parcel) => {
      const matchingBookings = [...new Set(parcel.grnNo || [])].map(grn => bookingsByGrn.get(grn)).filter(Boolean);

      let totalQuantity = 0;
      let grandTotal = 0;

      matchingBookings.forEach((booking) => {
        grandTotal += Number(booking.grandTotal) || 0;
        if (Array.isArray(booking.packages)) {
          totalQuantity += booking.packages.reduce(
            (sum, pkg) => sum + (Number(pkg.quantity) || 0),
            0
          );
        }
      });

      return {
        voucherNo: parcel.vocherNoUnique || "",
        fromCity: parcel.fromCity || "",
        toCity: parcel.toCity || "",
        loadingDate: parcel.loadingDate,
        vehicalNumber: parcel.vehicalNumber,
        totalParcel: parcel.grnNo?.length || 0,
        totalQuantity,
        grandTotal,
      };
    });

    report(result);
  } catch (error) {
    console.error("Error in offlineParcelVoucherDetails:", error);
    res.status(500).json({ error: error.message });
  }
};



const dispatchedStockReport = async (req, res) => {
  let databasePagination;
  const report = payload => sendReportPage(res, payload, databasePagination);
  try {
    const { companyId } = req.user || {};
    const { fromDate, toDate, fromCity, toCity, fromBranch } = req.body;

    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized: Company ID missing", success: false });
    }

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "fromDate and toDate are required", success: false });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "Invalid date format", success: false });
    }

    const query = {
      companyId, // <-- This is the important addition
      loadingDate: { $gte: start, $lte: end },
    };

    if (fromCity) query.fromCity = fromCity;
    if (toCity) query.toCity = toCity;
    if (fromBranch) query.fromBranch = fromBranch;

    const page = await queryReportPage(ParcelLoading.find(query)
      .sort({ loadingDate: -1, _id: -1 })
      .lean(), req);
    const dispatchedStock = page.rows;
    databasePagination = page.pagination;

    if (!page.totals.totalRecords) {
      return sendEmptyReport(req, res, {
        message: "No dispatched stock found for the given criteria",
        success: false,
      });
    }

    report({
      success: true,
      count: page.totals.totalRecords,
      data: dispatchedStock,
    });
  } catch (error) {
    console.error("Error generating dispatched stock report:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};


export default {
  getBookingsBetweenDates,
  createParcel,
  getParcelById,
  getAllParcels,
  getParcelVocherNoUnique,
  updateParcel,
  deleteParcel,
  // getParcelsByFilter,
  updateAllGrnNumbers,
  getParcelByLrNumber,
  getParcelByVehicalNumber,
  offlineParcelVoucherDetails,
  parcelStatusReport,
  parcelPendingReport,
  getParcelByGrnNo,
  createBranchToBranch,
  getBookingsByDateAndBranch,
  dispatchedStockReport,
  offlineParcelVoucherDetailsPrint,
  parcelOfflineReport,
};
