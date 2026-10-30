import { ApiError } from './api-error.js';

// Report dates represent calendar days in the logistics business timezone (India).
export function reportDay(value) {
  if (typeof value !== 'string') throw new ApiError(400, 'Report date must be YYYY-MM-DD or DD-MM-YYYY');
  let year, month, day;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) [year, month, day] = value.split('-').map(Number);
  else if (/^\d{2}-\d{2}-\d{4}$/.test(value)) [day, month, year] = value.split('-').map(Number);
  else throw new ApiError(400, 'Report date must be YYYY-MM-DD or DD-MM-YYYY');
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new ApiError(400, 'Invalid report calendar date');
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export const reportDayStart = value => new Date(`${reportDay(value)}T00:00:00.000+05:30`);
export const reportDayEnd = value => new Date(`${reportDay(value)}T23:59:59.999+05:30`);

export function validateReportInput(req) {
  const input = req.body || {};
  for (const field of ['fromDate', 'toDate', 'startDate', 'endDate', 'date', 'selectedDate']) {
    if (input[field] !== undefined && input[field] !== null && input[field] !== '') reportDay(input[field]);
  }
  for (const [from, to] of [['fromDate', 'toDate'], ['startDate', 'endDate']]) {
    if (input[from] && input[to] && reportDay(input[from]) > reportDay(input[to])) {
      throw new ApiError(400, 'Start date must not be after end date');
    }
  }
  if (input.bookedBy && (typeof input.bookedBy !== 'string' || !/^[a-f\d]{24}$/i.test(input.bookedBy))) {
    throw new ApiError(400, 'bookedBy must be a valid staff ID');
  }
}
