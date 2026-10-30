export function validateEnvironment(env = process.env) {
  const missing = ['MONGO_URI', 'JWT_SECRET', 'COMPANY_SECRET'].filter(key => !env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  const port = Number(env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535');
  return { port };
}
