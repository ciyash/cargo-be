import { AsyncLocalStorage } from 'node:async_hooks';
import mongoose from 'mongoose';
import { companyAdmin } from './roles.js';

const context = new AsyncLocalStorage();
export const withLegacyDataScope = (user, callback) => context.run(user, async () => await callback());
export const withoutLegacyDataScope = callback => withLegacyDataScope(null, callback);
export function legacyDataFilter(user, kind = 'booking', aggregate = false) {
  if (!user?.companyId) return null;
  const companyId = aggregate ? new mongoose.Types.ObjectId(user.companyId) : user.companyId;
  if (companyAdmin(user)) return { companyId };
  const branch = user.branchId || '__unassigned__';
  if (kind === 'delivery') return { companyId, deliveryBranch: branch };
  if (kind === 'statement') return { companyId, originBranch: branch };
  if (kind === 'loading') return { companyId, fromBranch: branch };
  if (kind === 'unloading') return { companyId, $or:[{branch},{unloadBranch:branch}] };
  if (kind === 'expense') return { companyId, branchId:{$in:[branch,user.branchObjectId||'__unassigned__']} };
  return { companyId, $or: [{ pickUpBranch: branch }, { dropBranch: branch }, { unloadingBranch: branch }] };
}
export function legacyDataScopePlugin(schema, { kind = 'booking' } = {}) {
  schema.pre(/^(find|count|distinct|update|delete|replace)/, async function () {
    const user = context.getStore();
    let scope = legacyDataFilter(user, kind);
    // Historical statements have no originBranch. Resolve ownership through
    // their bookings; never infer branch ownership from a nonunique display name.
    if (scope && kind === 'statement' && !companyAdmin(user)) {
      const legacy = await this.model.collection.aggregate(historicalStatementScope(user)).toArray();
      scope = { companyId: user.companyId, $or: [{originBranch:user.branchId||'__unassigned__'}, {_id:{$in:legacy.map(row=>row._id)}}] };
    }
    if (scope) this.setQuery({ $and: [this.getFilter(), scope] });
  });
  schema.pre('aggregate', function () {
    const scope = legacyDataFilter(context.getStore(), kind, true);
    if (scope) this.pipeline().unshift({ $match: scope });
  });
}

export function historicalStatementScope(user) {
  const branch = user.branchId || '__unassigned__';
  return [
    {$match:{companyId:new mongoose.Types.ObjectId(user.companyId),originBranch:{$exists:false},'grnNo.0':{$exists:true}}},
    {$lookup:{from:'bookings',let:{grns:'$grnNo',tenant:'$companyId'},pipeline:[
      {$match:{$expr:{$and:[{$eq:['$companyId','$$tenant']},{$in:['$grnNo','$$grns']}]}}},
      {$group:{_id:null,total:{$sum:1},owned:{$sum:{$cond:[{$eq:['$pickUpBranch',branch]},1,0]}}}},
    ],as:'ownership'}},
    {$match:{$expr:{$and:[{$eq:[{$arrayElemAt:['$ownership.total',0]},{$size:'$grnNo'}]},{$eq:[{$arrayElemAt:['$ownership.owned',0]},{$size:'$grnNo'}]}]}}},
    {$project:{_id:1}},
  ];
}
