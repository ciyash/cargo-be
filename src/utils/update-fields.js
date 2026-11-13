import { ApiError } from './api-error.js';

const protectedKeys = new Set(['_id', '__v', 'companyId', 'createdBy', 'bookedBy','bookedByCompany', 'loadingBy', 'unLoadingBy', 'createdAt','bookingStatus','quotaStatus','confirmationStatus','provider','fulfilment','requestKey','requestHash','trackingEvents','shipmentStage','franchiseQuota','bookingQuota','grnNo','lrNumber']);
export function writableFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'An update object is required');
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith('$') || key.includes('.') || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new ApiError(400, 'Invalid update field');
    if (!protectedKeys.has(key) && !['bookbranchid','pickUpBranch','dropBranch','loadingDate','unloadingDate','unloadingBranch','deliveryDate','category'].includes(key)) result[key] = value;
  }
  return result;
}
