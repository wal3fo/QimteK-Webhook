/**
 * Cleanup utility for expired webhooks
 */
import db from '../db.js';

/**
 * Delete expired webhooks and their associated requests
 */
export function cleanupExpiredWebhooks(): void {
  try {
    const stmt = db.prepare(`
      DELETE FROM webhooks 
      WHERE expires_at < datetime('now') OR is_active = 0
    `);
    
    const result = stmt.run();
    console.log(`Cleaned up ${result.changes} expired webhook(s)`);
  } catch (error) {
    console.error('Error cleaning up expired webhooks:', error);
  }
}

/**
 * Start periodic cleanup job
 */
export function startCleanupJob(intervalMinutes: number = 60): void {
  // Run cleanup immediately
  cleanupExpiredWebhooks();
  
  // Then run periodically
  setInterval(() => {
    cleanupExpiredWebhooks();
  }, intervalMinutes * 60 * 1000);
  
  console.log(`Cleanup job started (runs every ${intervalMinutes} minutes)`);
}
