/**
 * Local development server entry file
 */
import 'dotenv/config'; // Load env vars before anything else
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Manual fallback for loading .env in production if dotenv/config failed to find it
// (Replit production mode sometimes skips .env loading)
if (!process.env.SUPABASE_URL) {
  const envPath = path.join(process.cwd(), '.env');
  console.log('⚠️ Environment variables missing. Attempting manual .env load from:', envPath);

  if (fs.existsSync(envPath)) {
    console.log('✅ Found .env file. Parsing...');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
    console.log('✅ .env file loaded manually.');
  } else {
    console.error('❌ .env file NOT FOUND at:', envPath);
  }
}

import app from './app.js';
import { initDb } from './db.js';
import { startCleanupJob } from './utils/cleanup.js';

// Debug Environment
console.log('🔧 Server Startup Environment Check:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DB_PATH:', process.env.DB_PATH);
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('   SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Set' : '❌ Missing');


/**
 * Initialize database (async)
 */
initDb().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

/**
 * Start cleanup job for expired webhooks (runs every hour)
 */
startCleanupJob(60);

/**
 * Create HTTP server
 */
const server = createServer(app);

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;