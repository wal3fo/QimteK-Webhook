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
 * Delete requests older than 24h for Free plan users
 */
export async function cleanupOldRequests(): Promise<void> {
  try {
    // 1. Get tokens of webhooks belonging to Free users
    // We assume 'user' role is the Free plan
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhooks')
      .select('token, user:users!inner(role)')
      .eq('user.role', 'user');

    if (webhookError) throw webhookError;
    
    if (!webhooks || webhooks.length === 0) return;
    
    const tokens = webhooks.map((w: any) => w.token);
    
    if (tokens.length === 0) return;

    // 2. Delete requests older than 24h for these tokens
    const retentionHours = 24;
    const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000).toISOString();
    
    const { count, error: deleteError } = await supabase
      .from('requests')
      .delete({ count: 'exact' })
      .in('webhook_token', tokens)
      .lt('timestamp', cutoff);
      
    if (deleteError) throw deleteError;
    
    if (count && count > 0) {
        console.log(`Cleaned up ${count} old requests for Free users`);
    }
  } catch (error) {
    console.error('Error cleaning up old requests:', error);
  }
}

/**
 * Start periodic cleanup job
 */
export function startCleanupJob(intervalMinutes: number = 60): void {
  // Run cleanup immediately
  cleanupExpiredWebhooks().catch(console.error);
  cleanupOldRequests().catch(console.error);
  
  // Then run periodically
  setInterval(() => {
    cleanupExpiredWebhooks().catch(console.error);
    cleanupOldRequests().catch(console.error);
  }, intervalMinutes * 60 * 1000);
  
  console.log(`Cleanup job started (runs every ${intervalMinutes} minutes)`);
}
