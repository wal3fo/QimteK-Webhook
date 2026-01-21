/**
 * Local development server entry file
 * 
 * NOTE: This file is ONLY for local development.
 * In Vercel production, use api/index.ts (serverless handler).
 */
import { createServer } from 'http';
import app from './app.js';
import { initDb } from './db.js';
import { startCleanupJob } from './utils/cleanup.js';

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