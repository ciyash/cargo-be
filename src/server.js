import 'dotenv/config';

import mongoose from 'mongoose';
import { createApp } from './app.js';
import { validateEnvironment } from './config/environment.js';

let server;
let stopping = false;

function logMongoError(message, error) {
  // Driver messages can contain connection details. Log only the error type and code.
  const details = [error.name, error.code].filter(Boolean).join(', ');
  console.error(`[MongoDB] ${message}${details ? ` (${details})` : ''}`);
}

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
  console.log('[MongoDB] Connecting...');
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
      minPoolSize: 0,
      autoIndex: process.env.NODE_ENV !== 'production',
    });
  } catch (error) {
    logMongoError('Connection failed', error);
    process.exitCode = 1;
    await shutdown();
    return;
  }

  if (stopping) {
    await mongoose.disconnect();
    return;
  }

  console.log('[MongoDB] Connected');
  mongoose.connection.on('disconnected', () => {
    if (!stopping) console.error('[MongoDB] Disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    if (!stopping) console.log('[MongoDB] Reconnected');
  });
  mongoose.connection.on('error', error => {
    if (!stopping) logMongoError('Connection error', error);
  });

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
  console.error('Backend startup failed:', error.message);
  process.exitCode = 1;
  await shutdown();
});
