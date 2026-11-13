import { Booking, Delivery } from '../models/booking.model.js';
import { ApiError } from '../utils/api-error.js';
import { companyAdmin } from './roles.js';
import { phoneNumber } from '../utils/phone.js';

export async function deliverBooking(body, user) {
  if (!user?.companyId || !user.id && user.accountType !== 'company' || !user.branchId && !companyAdmin(user)) throw new ApiError(401, 'Company, user and branch details are required');
  const grnNo = Number(body.grnNo);
  const amount = Number(body.toPayDeliveredAmount);
  if (!Number.isSafeInteger(grnNo) || grnNo <= 0 || !body.receiverName || !body.receiverMobile || body.toPayDeliveredAmount == null || !Number.isFinite(amount) || amount < 0) {
    throw new ApiError(400, 'Provide a valid GRN, receiver details and non-negative delivery amount');
  }
  const session = await Booking.startSession();
  try {
    return await session.withTransaction(async () => {
      const booking = await Booking.findOne({ grnNo, companyId: user.companyId }).session(session);
      if (!booking) throw new ApiError(404, 'Booking not found');
      phoneNumber(body.receiverMobile,'Receiver phone',booking.category==='international');
      if(booking.fulfilment==='external'||booking.confirmationStatus&&booking.confirmationStatus!=='confirmed')throw new ApiError(409,'Only confirmed own-logistics shipments can use branch delivery');
      if (booking.bookingStatus !== 2) throw new ApiError(409, 'Booking must be unloaded before delivery');
      if (!companyAdmin(user) && booking.unloadingBranch !== user.branchId) throw new ApiError(403, 'Parcel was unloaded at a different branch');
      if(booking.bookingType==='toPay'&&Math.abs(amount-booking.grandTotal)>.01)throw new ApiError(400,'Collect the full To Pay freight before delivery');
      if(booking.bookingType && booking.bookingType!=='toPay' && amount!==0)throw new ApiError(400,'Only To Pay freight can be collected at delivery');
      const deliveryDate = new Date();
      const changes = {
        deliveryDate, deliveryEmployee: user.name || user.username || '', deliveryBranch: booking.unloadingBranch || booking.dropBranch,
        deliveryBranchName: booking.unloadingBranchname || booking.dropBranchname || user.branchName || '', deliveryCity: booking.toCity || user.branchCity || '',
        receiverName: body.receiverName, receiverMobile: body.receiverMobile, toPayDeliveredAmount: amount,
      };
      await new Delivery({ ...changes, companyId: user.companyId, bookingId: booking._id, grnNo, bookingType: booking.bookingType }).save({ session });
      Object.assign(booking, changes, { bookingStatus: 4, ltDate: deliveryDate, ltCity: changes.deliveryCity, ltBranch: changes.deliveryBranch, ltEmployee: changes.deliveryEmployee });
      await booking.save({ session, validateModifiedOnly: true });
      return booking;
    });
  } finally { await session.endSession(); }
}
