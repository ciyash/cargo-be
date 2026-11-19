import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import router from './routes/index.js';
import ownerRouter from './routes/owner.route.js';
import billingRouter, { paymentWebhook } from './routes/billing.route.js';
import workspaceRouter, { carrierWebhook } from './routes/workspace.route.js';
import { unifiedLogin } from './controllers/unified-login.controller.js';
import { authenticationThrottle } from './utils/auth-throttle.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  if (!origins.length && process.env.NODE_ENV !== 'production') {
    app.use(cors());
  } else {
    app.use(cors({
      origin: [
        'https://cargo-mk89qzz68-ciyashs-projects.vercel.app',
        'https://cargo-fe-tau.vercel.app',
        'http://localhost:4200',
        ...origins,
      ],
    }));
  }
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // Razorpay signature verification requires the original request body.
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
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'unavailable',
      database: ready ? 'connected' : 'disconnected',
      revision: /^[a-f0-9]{40}$/i.test(revision || '') ? revision : null,
    });
  });
  app.use('/api/owner', ownerRouter);
  app.use('/billing', billingRouter);
  app.use('/owner', express.static(fileURLToPath(new URL("../public/owner", import.meta.url))));
  app.use('/', router);

  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    let status = 500;
    if (error.status >= 400 && error.status < 600) {
      status = error.status;
    } else if (error.name === 'ValidationError' || error.name === 'CastError') {
      status = 400;
    } else if (error.code === 11000) {
      status = 409;
    }

    const message = status === 500 ? 'Internal Server Error' : error.message;
    return res.status(status).json({ message });
  });

  return app;
}
  
