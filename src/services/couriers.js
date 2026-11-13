
export { encryptCredentials, decryptCredentials } from './courier-secrets.js';
import { CourierConnection } from '../models/logistics.model.js';
import { ApiError } from '../utils/api-error.js';

export function providerCatalog(){return [
  {key:'delhivery',name:'Delhivery',categories:['domestic'],implemented:true,wallet:false,tracking:true,fee:fee('DELHIVERY_ENABLEMENT_PAISE'),portalUrl:'https://one.delhivery.com/',note:'Domestic India: Surface / Express estimates, AWB, tracking and cancellation. Recharge and wallet statements open in Delhivery One. International API is not enabled.'},
];}
function fee(key){const value=Number(process.env[key]);return Number.isSafeInteger(value)&&value>=100?value:null;}
export async function courierConnection(companyId,key){
  if(key!=='delhivery')throw new ApiError(422,'Only Delhivery is supported');
  const connection=await CourierConnection.findOne({companyId,providerKey:key}).select('+credentials');
  if(!connection?.enabled||!connection.connected)throw new ApiError(403,'Company must purchase and connect this service first');
  return connection;
}
