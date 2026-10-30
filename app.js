import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import router from './routes/index.js';
import ownerRouter from './routes/owner.route.js';
import billingRouter, { paymentWebhook } from './routes/billing.route.js';
import { fileURLToPath } from 'node:url';

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
  app.get('/health', (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable', database: ready ? 'connected' : 'disconnected' });
  });
  app.use('/api/owner', ownerRouter);
  app.use('/billing', billingRouter);
  app.use('/owner', express.static(fileURLToPath(new URL('./public/owner', import.meta.url))));
  app.use('/', router);
  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status >= 400 && error.status < 600 ? error.status : 500;
    res.status(status).json({ message: status === 500 ? 'Internal Server Error' : error.message });
  });
  return app;
}
