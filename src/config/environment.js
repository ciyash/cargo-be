export function validateEnvironment(env = process.env) {
  const missing = ['MONGO_URI', 'JWT_SECRET', 'COMPANY_SECRET'].filter(key => !env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  const port = Number(env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535');
  if(env.NODE_ENV==='production'){
    const shortSecrets = ['JWT_SECRET', 'COMPANY_SECRET'].filter(key => env[key].length < 32);
    if (shortSecrets.length) {
      throw new Error(`Production secrets must have at least 32 characters. Update: ${shortSecrets.join(', ')}`);
    }
    if(env.JWT_SECRET===env.COMPANY_SECRET)throw new Error('Production staff and company secrets must be different');
    const origins=(env.CORS_ORIGINS||'').split(',').map(value=>value.trim()).filter(Boolean);
    if(origins.some(origin=>{try{return !['http:','https:'].includes(new URL(origin).protocol)||new URL(origin).origin!==origin;}catch{return true;}}))throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins');
  }
  return { port };
}
