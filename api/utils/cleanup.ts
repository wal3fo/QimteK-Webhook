/**
 * Cleanup utility for expired webhooks
 */
import db from '../db.js';

/**
 * Delete expired webhooks and their associated requests
 */
export async function cleanupExpiredWebhooks(): Promise<void> {
  try {
    if (!db) {
      console.warn('Database not initialized, skipping cleanup');
      return;
    }
    
    const stmt = db.prepare(`
      DELETE FROM webhooks 
      WHERE expires_at < datetime('now') OR is_active = 0
    `);
    
    const result = stmt.run();
    const finalResult = await (result instanceof Promise ? result : Promise.resolve(result));
    console.log(`Cleaned up ${finalResult.changes} expired webhook(s)`);
  } catch (error) {
    console.error('Error cleaning up expired webhooks:', error);
  }
}

/**
 * Start periodic cleanup job
 */
export function startCleanupJob(intervalMinutes: number = 60): void {
  // Run cleanup immediately
  cleanupExpiredWebhooks().catch(console.error);
  
  // Then run periodically
  setInterval(() => {
    cleanupExpiredWebhooks().catch(console.error);
  }, intervalMinutes * 60 * 1000);
  
  console.log(`Cleanup job started (runs every ${intervalMinutes} minutes)`);
}
