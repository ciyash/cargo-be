export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendError(res, error) {
  const status = error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : error.code === 11000 ? 409 : 500);
  return res.status(status).json({ message: status === 500 ? 'Internal Server Error' : error.message });
}

export const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function dateRange(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (!startValue || !endValue || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new ApiError(400, 'A valid start and end date are required');
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (start > end) throw new ApiError(400, 'Start date must not be after end date');
  return { $gte: start, $lte: end };
}
