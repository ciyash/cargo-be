import { Booking, Delivery } from '../models/booking.model.js';
import { Expense } from '../models/expensive.model.js';
import { money } from './booking-calculation.js';

// Booked credit and uncollected To Pay freight are not receipts. A cancelled
// prepaid booking reverses its receipt on the cancellation date, not its booking date.
export async function branchMovements(companyId, branch, range) {
  const sum = (Model, match, field) => Model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: field } } }]).then(rows => Number(rows[0]?.total || 0));
  const paid = { companyId, pickUpBranch: branch.branchUniqueId, bookingType: 'paid', confirmationStatus: { $nin: ['pending', 'failed'] } };
  const [receipts, delivery, reversals, expenses] = await Promise.all([
    sum(Booking, { ...paid, bookingDate: range }, '$grandTotal'),
    sum(Delivery, { companyId, deliveryBranch: branch.branchUniqueId, bookingType: 'toPay', deliveryDate: range }, '$toPayDeliveredAmount'),
    sum(Booking, { ...paid, bookingStatus: 5, cancelDate: range }, '$grandTotal'),
    sum(Expense, { companyId, branchId: { $in: [branch.branchUniqueId, String(branch._id)] }, expenseDate: range }, '$amount'),
  ]);
  // Net receipts may be negative when a previous day's prepaid shipment is cancelled.
  return { income: Math.round((receipts + delivery - reversals) * 100) / 100, expenses: money(expenses, 'expenses'), receipts, delivery, reversals };
}
