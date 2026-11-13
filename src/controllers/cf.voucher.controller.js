import { sendReport, sendEmptyReport, queryReportPage, sendReportPage, getReportPagination } from "../utils/report-pagination.js";
import { createVouchers } from "../services/voucher-workflow.js";
import { sendError, escapeRegex } from "../utils/api-error.js";
import { reportDayStart, reportDayEnd } from '../utils/report-input.js';
import CFVoucher from '../models/cf.voucher.generate.model.js';
import { Booking } from '../models/booking.model.js';


// Generate the next voucher number
const generateVoucher = async () => {
  const lastVoucher = await CFVoucher.findOne().sort({ voucherNo: -1 });
  return lastVoucher ? lastVoucher.voucherNo + 1 : 100;
};


const creditForVoucherGenerate = async (req, res) => {
  const report = payload => sendReport(req, res, payload, 'creditForVoucherGenerate');
  try {
    const { fromDate, toDate, senderName } = req.body;
    const companyId = req.user?.companyId;
    const role = req.user?.role;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Missing date filters" });
    }

    const range = {$gte:reportDayStart(fromDate),$lte:reportDayEnd(toDate)};
    if(range.$gte>range.$lte)return res.status(400).json({message:'Start date must not be after end date'});

    const query = {
      companyId,
      bookingDate: range,
      bookingType: 'credit',
      bookingStatus: { $ne: 5 },
      confirmationStatus: 'confirmed',
      agent: { $exists: true, $type: "string", $ne: "" },
      // bookingStatus: 0
      status: false
    };

    // 🔐 Role-based filtering
    if (role === "staff") {
      query.pickUpBranch = req.user.branchId;
    } else if (role === "admin") {
      query.pickUpBranch = req.user.branchId;
    }
    // Admin = no additional branch/city filters

    if (senderName) {
      query.agent = { $regex: `^${escapeRegex(senderName)}$`, $options: "i" };
    }

    const bookings = await Booking.find(query)
      .sort({ bookingDate: -1 , _id: 1 })
      .select("grnNo lrNumber senderName pickUpBranchname dropBranchname bookingStatus grandTotal bookingDate agent");

    if (!bookings.length) {
      return sendEmptyReport(req, res, { message: "No bookings found" });
    }

    report(bookings);
  } catch (error) {
    console.error("Error in creditForVoucherGenerate:", error);
    return sendError(res, error);
  }
};


// Create new voucher and update booking statuses
// const createCFVoucher = async (req, res) => {
//   try {

//     const companyId = req.user?.companyId;
//     if (!companyId) return res.status(401).json({ message: "Unauthorized" });

//     const {
//       grnNo,
//       lrNumber,
//       creditForAgent,
//       fromBranch,
//       toBranch,
//       consignor,
//       bookingStatus,
//       charge
//     } = req.body;

//     const voucherNo = await generateVoucher();

//     const newVoucher = new CFVoucher({
//       companyId,
//       voucherNo,
//       grnNo,
//       lrNumber,
//       creditForAgent,
//       fromBranch,
//       toBranch,
//       consignor,
//       bookingStatus,
//       charge
//     });

//     await newVoucher.save();

//     const grnList = Array.isArray(grnNo) ? grnNo.map(Number) : [Number(grnNo)];

//     await Booking.updateMany(
//       { grnNo: { $in: grnList }, companyId },
//       { $set: { bookingStatus: 1, status: true } }
//     );

//     res.status(201).json({ message: "CF Voucher created", newVoucher });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };


const createCFVoucher = async (req, res) => {
  try {
    const vouchers = await createVouchers(req.body, req.user);
    return res.status(201).json({ message: 'CF Voucher(s) created successfully', count: vouchers.length, vouchers });
  } catch (error) { return sendError(res, error); }
};


// Get all vouchers for current company
const getAllCFVouchers = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const vouchers = await CFVoucher.find({ companyId });
    res.status(200).json(vouchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get voucher by ID with company scope
const getCFVoucherById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const voucher = await CFVoucher.findOne({ _id: id, companyId });
    if (!voucher) return res.status(404).json({ message: "CF Voucher not found" });
    res.status(200).json(voucher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update voucher
const updateCFVoucher = async (req, res) => {
  return res.status(409).json({message:'Issued statements cannot be edited directly. Eligible booking cancellations reverse their statement entries automatically.'});
};

// Delete voucher
const deleteCFVoucher = async (req, res) => {
  return res.status(409).json({message:'Statement history cannot be deleted. Eligible booking cancellations retain a reversal history.'});
};

// Summary of vouchers by date range
const voucherDetails = async (req, res) => {
  const report = payload => sendReport(req, res, payload, 'voucherDetails');
  try {
    const { fromDate, toDate, senderName } = req.body;
    const companyId = req.user?.companyId;
    if (!fromDate || !toDate || !companyId) {
      return res.status(400).json({ message: "Required parameters missing" });
    }

    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const query = {
      companyId,
      generateDate: { $gte: start, $lte: end }
    };
    if (senderName) query.consignor = senderName;

    const vouchers = await CFVoucher.find(query)
      .select("grnNo voucherNo consignor")
      .sort({ generateDate: -1 , _id: 1 });

    if (!vouchers.length) return sendEmptyReport(req, res, { message: "No vouchers found" });

    const grnNos = vouchers.flatMap(v => v.grnNo);
    const bookings = await Booking.find({ grnNo: { $in: grnNos }, companyId }).sort({ _id: 1 }).select("grnNo packages grandTotal");

    const bookingMap = new Map();
    bookings.forEach(b => bookingMap.set(b.grnNo, b));

    let totalGrandTotal = 0;
    const data = vouchers.map(v => {
      let totalAmount = 0;
      let totalPackages = 0;
      v.grnNo.forEach(grn => {
        const b = bookingMap.get(grn);
        if (b) {
          totalAmount += b.grandTotal || 0;
          totalPackages += b.packages?.length || 0;
        }
      });
      totalGrandTotal += totalAmount;
      return {
        voucherNo: v.voucherNo,
        agentName: v.consignor,
        noOfParcel: totalPackages,
        amount: totalAmount
      };
    });

    report({ totalAmount: totalGrandTotal, data });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// const voucherDetailsPrint = async (req, res) => {
//   try {
//     const {voucherNo, creditForAgent } = req.body;
//     const companyId = req.user?.companyId;
//     const role = req.user?.role;

//       if (!voucherNo || !creditForAgent) {
//       return res.status(400).json({ message: "voucherNo and creditForAgent Missing fields" });
//     }


//     if (!companyId) {
//       return res.status(400).json({ message: "companyId missing" });
//     }

//     const query = {
//       senderName,
//       companyId
//     };

//     if (role === "employee") {
//       query.pickUpBranch = req.user.branchId;
//     } else if (role === "subadmin") {
//       query.fromCity = req.user.branchCity;
//     }
//     // admin → no additional filters

//     const bookings = await Booking.find(query).select(
//       "grnNo bookingDate agent senderName senderAddress fromCity toCity packages parcelGstAmount grandTotal"
//     );

//     let allGrandTotal = 0;
//     const data = bookings.map(b => {
//       const totalWeight = b.packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
//       const totalPackages = b.packages.length;
//       allGrandTotal += b.grandTotal || 0;

//       return {
//         grnNo: b.grnNo,
//         bookingDate: b.bookingDate,
//         fromCity: b.fromCity,
//         senderName: b.senderName,
//         agent: b.agent,
//         senderAddress: b.senderAddress,
//         toCity: b.toCity,
//         packageDetails: b.packages,
//         totalPackages,
//         parcelGstAmount: b.parcelGstAmount || 0,
//         totalWeight,
//         grandTotal: b.grandTotal || 0
//       };
//     });

//     const senderAddress = bookings.length > 0 ? bookings[0].senderAddress : "";

//     report({
//       success: true,
//       senderName,
//       senderAddress,
//       totalRecords: bookings.length,
//       data,
//       allGrandTotal
//     });

//   } catch (error) {
//     console.error("Error in voucherDetailsPrint:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

const voucherDetailsPrint = async (req, res) => {
  try {
    const { voucherNo, creditForAgent } = req.body;
    const companyId = req.user?.companyId;
    const role = req.user?.role;

    if (!voucherNo || !creditForAgent) {
      return res.status(400).json({ message: "voucherNo and creditForAgent are required" });
    }

    if (!companyId) {
      return res.status(400).json({ message: "companyId missing" });
    }

    // Step 1: Fetch voucher and extract GRNs
    const voucher = await CFVoucher.findOne({
      companyId,
      voucherNo,
      creditForAgent
    });

    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    const grnNos = voucher.grnNo || [];

    // Step 2: Prepare Booking query with role-based filters
    const query = {
      grnNo: { $in: grnNos },
      companyId
    };

    if (role === "staff") {
      query.pickUpBranch = req.user.branchId;
    } else if (role === "admin") {
      query.fromCity = req.user.branchCity;
    }

    // Step 3: Fetch bookings
    const bookings = await Booking.find(query).select(
      "grnNo bookingDate agent senderName senderAddress fromCity toCity packages parcelGstAmount grandTotal"
    );

    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found for this voucher" });
    }

    let allGrandTotal = 0;

    const data = bookings.map(b => {
      const totalWeight = b.packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
      const totalPackages = b.packages.length;
      allGrandTotal += b.grandTotal || 0;

      return {
        grnNo: b.grnNo,
        bookingDate: b.bookingDate,
        fromCity: b.fromCity,
        senderName: b.senderName,
        agent: b.agent,
        senderAddress: b.senderAddress,
        toCity: b.toCity,
        packageDetails: b.packages,
        totalPackages,
        parcelGstAmount: b.parcelGstAmount || 0,
        totalWeight,
        grandTotal: b.grandTotal || 0
      };
    });

    const senderName = bookings[0].senderName || "";
    const senderAddress = bookings[0].senderAddress || "";

    // Final response
    res.status(200).json({
      success: true,
      voucherNo,
      creditForAgent,
      senderName,
      senderAddress,
      totalRecords: bookings.length,
      data,
      allGrandTotal
    });

  } catch (error) {
    console.error("Error in voucherDetailsPrint:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export default {
  creditForVoucherGenerate,
  createCFVoucher,
  getAllCFVouchers,
  getCFVoucherById,
  updateCFVoucher,
  deleteCFVoucher,
  voucherDetails,
  voucherDetailsPrint,
};
