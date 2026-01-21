/**
 * Vercel deploy entry handler, for serverless deployment
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from './app.js';
import { initDb } from './db.js';

// Initialize database on first request (serverless functions are stateless)
let dbInitialized = false;
const initPromise = initDb().then(() => {
  dbInitialized = true;
  console.log('Database initialized for serverless function');
}).catch((err) => {
  console.error('Failed to initialize database:', err);
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure database is initialized before handling request
  if (!dbInitialized) {
    await initPromise;
  }
  return app(req, res);
}