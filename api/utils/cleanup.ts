/**
 * Cleanup utility for expired webhooks
 */
import { supabase } from '../lib/supabase.js';

/**
 * Delete expired webhooks and their associated requests
 */
export async function cleanupExpiredWebhooks(): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Delete webhooks that are expired OR inactive
    // Note: Supabase doesn't support complex OR conditions across different fields easily in one delete
    // So we might need two queries or a more complex filter string if supported.
    // Using .or() with filter syntax:
    // expires_at.lt.now,is_active.eq.false
    
    const { count, error } = await supabase
      .from('webhooks')
      .delete({ count: 'exact' })
      .or(`expires_at.lt.${now},is_active.eq.false`);

    if (error) {
      throw error;
    }
    
    console.log(`Cleaned up ${count} expired/inactive webhook(s)`);
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
