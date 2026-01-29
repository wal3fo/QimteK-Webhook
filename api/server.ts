/**
 * Server entry file
 */
import 'dotenv/config';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, type Response } from 'express';
import app from './app.js';
import { initializeDatabase } from './lib/database-init.js';
import { startCleanupJob } from './utils/cleanup.js';
import { initAdminAccount } from './utils/init-admin.js';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug Environment
console.log('🔧 Server Startup Environment Check:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `✅ Set (Starts with: ${process.env.SUPABASE_SERVICE_ROLE_KEY.trim().substring(0, 5)}...)` : '❌ Missing (Required for backend operations)');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? `✅ Set (Starts with: ${process.env.SUPABASE_ANON_KEY.trim().substring(0, 5)}...)` : '❌ Missing');

/**
 * Initialize database and start server
 */
const startServer = async () => {
  try {
    // Calls initDatabase ONCE
    await initializeDatabase();

    // Initialize admin account (application logic)
    await initAdminAccount();

    // Start cleanup job for expired webhooks (runs every hour)
    startCleanupJob(60);

    // Static File Serving (moved from app.ts)
    const distPathProd = path.join(__dirname, '../../dist');
    const distPathDev = path.join(__dirname, '../dist');
    let distPath = distPathProd;

    if (fs.existsSync(path.join(distPathDev, 'index.html'))) {
      distPath = distPathDev;
    }

    const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

    if (process.env.NODE_ENV === 'production' || hasDist) {
      console.log(`Serving static files from: ${distPath}`);
      app.use(express.static(distPath));

      app.get('*', (req: Request, res: Response) => {
        if (req.path.startsWith('/api')) {
          res.status(404).json({ success: false, error: 'API not found' });
          return;
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.use((req: Request, res: Response) => {
        res.status(404).json({
          success: false,
          error: 'API not found',
        });
      });
    }

    // Create HTTP server
    const server = createServer(app);

    const PORT = process.env.PORT || 3001;

    server.listen(PORT, () => {
      console.log(`✅ Server started on port ${PORT}`);
    });

    process.on('SIGTERM', () => {
      server.close(() => {
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (err) {
    // Supabase failure must crash the app
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

export default app;
