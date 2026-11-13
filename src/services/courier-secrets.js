import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ApiError } from '../utils/api-error.js';
function key(){const value=process.env.COURIER_ENCRYPTION_KEY;if(!value||!/^[a-f0-9]{64}$/i.test(value))throw new ApiError(503,'Configure a stable COURIER_ENCRYPTION_KEY before connecting a courier');return Buffer.from(value,'hex');}
export function assertCourierEncryption(){key();}
export function encryptCredentials(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(v=>v.toString('base64')).join('.');}
export function decryptCredentials(value){const [iv,tag,data]=String(value||'').split('.').map(v=>Buffer.from(v,'base64'));const cipher=createDecipheriv('aes-256-gcm',key(),iv);cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8'));}
