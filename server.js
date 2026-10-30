import 'dotenv/config';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { validateEnvironment } from './config/environment.js';

// Resolve runtime configuration from this checkout even when launched elsewhere.
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

let server;
let stopping = false;

// Stop accepting requests, finish pending work, then disconnect MongoDB.
async function shutdown() {
  if (stopping) return;
  stopping = true;

  const timer = setTimeout(() => {
    server?.closeAllConnections();
    process.exit(1);
  }, 10000);
  timer.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close(error => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  } catch {
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      process.exitCode = 1;
    }
    clearTimeout(timer);
  }
}

async function start() {
  // 1. Check required settings from .env.
  const { port } = validateEnvironment();

  // 2. Connect to MongoDB before accepting requests.
  mongoose.set('bufferCommands', false);
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
    minPoolSize: 0,
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  if (stopping) {
    await mongoose.disconnect();
    return;
  }

  // 3. Start the Express app defined in app.js.
  const app = createApp();
  server = app.listen(port, () => {
    console.log('Server running on port ' + port);
  });

  server.requestTimeout = 60000;
  server.headersTimeout = 65000;

  server.on('error', async error => {
    console.error('HTTP server failed:', error.code || error.name);
    process.exitCode = 1;
    await shutdown();
  });
}

// Handle Ctrl+C and deployment stop signals.
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch(async error => {
  const message = error.name === 'MongooseServerSelectionError'
    ? 'Database unavailable'
    : error.message;

  console.error('Backend startup failed:', message);
  process.exitCode = 1;
  await mongoose.disconnect();
});
