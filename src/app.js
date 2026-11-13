import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import router from './routes/index.js';
import ownerRouter from './routes/owner.route.js';
import billingRouter, { paymentWebhook } from './routes/billing.route.js';
import { fileURLToPath } from 'node:url';
import workspaceRouter, { carrierWebhook } from './routes/workspace.route.js';
import { unifiedLogin } from './controllers/unified-login.controller.js';
import { authenticationThrottle } from './utils/auth-throttle.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  const origins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean);
  app.use(cors(origins?.length ? { origin: origins } : {}));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
  app.post('/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }), paymentWebhook);
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '40mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 1000 }));
  app.use(authenticationThrottle());
  app.post('/carrier-events/:companyId', carrierWebhook);
  app.post('/auth/login', unifiedLogin);
  app.use('/workspace', workspaceRouter);
  app.get('/health', (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    const revision = process.env.RENDER_GIT_COMMIT;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable', database: ready ? 'connected' : 'disconnected', revision: /^[a-f0-9]{40}$/i.test(revision || '') ? revision : null });
  });
  app.use('/api/owner', ownerRouter);
  app.use('/billing', billingRouter);
  app.use('/owner', express.static(fileURLToPath(new URL("../public/owner", import.meta.url))));
  app.use('/', router);
  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status >= 400 && error.status < 600 ? error.status : ['ValidationError','CastError'].includes(error.name)?400:error.code===11000?409:500;
    res.status(status).json({ message: status === 500 ? 'Internal Server Error' : error.message });
  });
  return app;
}
