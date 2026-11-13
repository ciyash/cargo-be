import { Booking } from '../models/booking.model.js';
import ParcelLoading from "../models/parcel.loading.model.js";
import ParcelUnloading from '../models/parcel.unloading.model.js';
import Branch from '../models/branch.model.js';
import { ApiError } from '../utils/api-error.js';
import { nextSequence } from './sequence.js';

export function validateParcelInput(body, user, { unloading = false, branchTransfer = false } = {}) {
  if (!user?.companyId || !user?.id && user.accountType !== 'company') throw new ApiError(401, 'Company and user details are required');
  if (!Array.isArray(body.grnNo) || !body.grnNo.length || body.grnNo.length > 1000) {
    throw new ApiError(400, 'Provide between 1 and 1000 GRN numbers');
  }
  const grnNo = body.grnNo.map(value => typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN);
  if (grnNo.some(n => !Number.isSafeInteger(n) || n <= 0) || new Set(grnNo).size !== grnNo.length) {
    throw new ApiError(400, 'GRN numbers must be distinct positive integers');
  }
  if (!Array.isArray(body.lrNumber) || body.lrNumber.length !== grnNo.length || body.lrNumber.some(lr => typeof lr !== 'string' || !lr.trim())) {
    throw new ApiError(400, 'Provide one LR number for each GRN');
  }
  const lrNumber = body.lrNumber.map(lr => lr.trim());
  if (new Set(lrNumber).size !== lrNumber.length) throw new ApiError(400, 'LR numbers must be distinct');
  const required = unloading ? branchTransfer ? ['unloadBranch'] : ['vehicalNumber', 'branch', 'bookingType'] : branchTransfer ? ['vehicalNumber', 'fromCity', 'fromBranch'] : ['vehicalNumber', 'fromCity', 'fromBranch', 'driverName', 'driverNo'];
  for (const key of required) {
    if (!['string', 'number'].includes(typeof body[key]) || !String(body[key]).trim()) throw new ApiError(400, `${key} is required`);
  }
  if (!unloading && (!Array.isArray(body.toCity) || !body.toCity.length || body.toCity.some(city => typeof city !== 'string' || !city.trim()))) {
    throw new ApiError(400, 'toCity must be a non-empty array of city names');
  }
  if (unloading && !branchTransfer && !['paid', 'toPay', 'credit', 'FOC'].includes(body.bookingType)) throw new ApiError(400, 'Invalid bookingType');
  return { grnNo, lrNumber };
}

export async function recordParcel(body, user, options = {}) {
  const { unloading = false, branchTransfer = false } = options;
  const { grnNo, lrNumber } = validateParcelInput(body, user, options);
  const Model = unloading ? ParcelUnloading : ParcelLoading;
  const voucherField = unloading ? 'unLoadingVoucher' : 'vocherNoUnique';
  const last = await Model.findOne({ companyId: user.companyId }).sort({ [voucherField]: -1 }).select(voucherField).lean();
  const voucher = await nextSequence(`${unloading ? 'unloading' : 'loading'}:${user.companyId}`, last?.[voucherField] || (unloading ? 9999 : 99999));
  const session = await Model.startSession();
  try {
    // withTransaction aborts errors and retries transient write conflicts.
    return await session.withTransaction(async () => {
      const filter = { companyId: user.companyId, grnNo: { $in: grnNo } };
      const bookings = await Booking.find(filter).session(session).lean();
      if (bookings.length !== grnNo.length) throw new ApiError(400, 'Some GRNs do not exist under your company');
      if(bookings.some(b=>b.fulfilment==='external'||b.confirmationStatus&&b.confirmationStatus!=='confirmed'))throw new ApiError(409,'Only confirmed own-logistics parcels can use branch operations');
      if(!['company_admin','superadmin'].includes(user.role)&&user.branchId){
        const branch=unloading?body.unloadBranch||body.branch:body.fromBranch;
        if(branch!==user.branchId)throw new ApiError(403,'Use your assigned branch for this operation');
        if(bookings.some(b=>{const owner=unloading?b.dropBranch:(b.bookingStatus===2?b.unloadingBranch:b.pickUpBranch);return owner&&owner!==user.branchId;}))throw new ApiError(403,'Selected parcels belong to another branch');
      }
      const lrSet = new Set(lrNumber);
      if (bookings.some(booking => !lrSet.has(booking.lrNumber))) throw new ApiError(400, 'LR numbers do not match the selected GRNs');
      const allowedStates = unloading ? [1] : branchTransfer ? [0, 2] : [0];
      if (bookings.some(booking => !allowedStates.includes(booking.bookingStatus))) throw new ApiError(409, 'Some bookings are no longer available for this operation');
      const operationBranch = unloading ? body.unloadBranch || body.branch : body.fromBranch;
      const branchRecord = await Branch.findOne({ companyId: user.companyId, branchUniqueId: operationBranch }).session(session).lean();
      const operationBranchName = branchRecord?.name || (user.branchId === operationBranch ? user.branchName : '') || '';
      const now = new Date();
      const updates = unloading ? {
        bookingStatus: 2, unloadingDate: now, unloadingBranch: body.unloadBranch || body.branch,
        unloadingBranchname: operationBranchName, unloadingByemp: user.name || user.username || '',
      } : {
        bookingStatus: 1, loadingDate: now, vehicalNumber: body.vehicalNumber,
        ...(body.driverName ? { driverName: body.driverName } : {}),
        loadingBranchname: operationBranchName, loadingByemp: user.name || user.username || '',
      };
      Object.assign(updates, { ltDate: now, ltCity: branchRecord?.city || user.branchCity || body.fromCity || '', ltBranch: operationBranch || '', ltEmployee: user.name || user.username || '' });
      const result = await Booking.updateMany({ ...filter, bookingStatus: { $in: allowedStates } }, { $set: updates }, { session, runValidators: true });
      if (result.matchedCount !== grnNo.length) throw new ApiError(409, 'Bookings changed during this operation; retry');
      const data = unloading ? {
        companyId: user.companyId, unLoadingBy: user.id, unLoadingByCompany: user.accountType==='company'?user.companyId:undefined, unLoadingVoucher: voucher, unloadingDate: now,
        vehicleNo: body.vehicalNumber, unloadBranch: body.unloadBranch || body.branch,
        branch: body.unloadBranch || body.branch, fromCity: bookings[0].fromCity,
        toCity: bookings[0].toCity, bookingType: body.bookingType || '', bookingStatus: '2',
        remarks: body.remarks, grnNo, lrNumber,
      } : {
        companyId: user.companyId, loadingBy: user.id, loadingByCompany: user.accountType==='company'?user.companyId:undefined, vocherNoUnique: voucher,
        loadingType: branchTransfer ? 'branchLoad' : 'offload', loadingDate: now,
        senderName: body.senderName, vehicalNumber: body.vehicalNumber, driverName: body.driverName,
        driverNo: body.driverNo, remarks: body.remarks, fromCity: body.fromCity,
        toCity: [...new Set(body.toCity.map(city => city.trim().toLowerCase()))],
        fromBranch: body.fromBranch, bookingStatus: '1', parcelStatus: body.parcelStatus, grnNo, lrNumber,
      };
      const parcel = await new Model(data).save({ session });
      const bookingDetails = unloading ? await Booking.find(filter).session(session).lean() : undefined;
      return { parcel, bookingDetails };
    });
  } finally {
    await session.endSession();
  }
}
