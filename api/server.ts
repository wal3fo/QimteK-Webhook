/**
 * Server entry file
 */
import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { initializeDatabase } from './lib/database-init.js';
import { startCleanupJob } from './utils/cleanup.js';
import { initAdminAccount } from './utils/init-admin.js';

// Debug Environment
console.log('🔧 Server Startup Environment Check:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');

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
