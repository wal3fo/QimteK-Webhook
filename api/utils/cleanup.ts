/**
 * Retention enforcement - plan-based automatic cleanup
 *
 * WHY: Free users get 24h retention; Pro/Admin get configurable/unlimited.
 *      Runs as cron or scheduled job. Uses plan config from DB (system_config).
 *      Prefer dropping partitions over row deletes when table is partitioned.
 */
import { supabase } from '../lib/supabase.js';
import { getPlans, type PlanConfig } from './plan-storage.js';

/** Map plan role to retention hours. 0 = unlimited (no deletion). */
function getRetentionHours(plan: PlanConfig[keyof PlanConfig]): number {
  return plan?.retentionHours ?? 24;
}

/**
 * Delete requests older than plan retention for each plan.
 * Free: 24h. Pro/Admin: from plan config (0 = unlimited).
 */
export async function cleanupOldRequests(): Promise<{ deleted: number; byPlan: Record<string, number> }> {
  const result = { deleted: 0, byPlan: {} as Record<string, number> };

  try {
    const plans = await getPlans();

    // Get webhooks with user roles (user_id -> users.id)
    const { data: webhooks, error: whError } = await supabase
      .from('webhooks')
      .select('token, user_id');

    if (whError) throw whError;
    if (!webhooks?.length) return result;

    const userIds = [...new Set((webhooks as { user_id: string }[]).map((w) => w.user_id))];
    const { data: usersData, error: uError } = await supabase
      .from('users')
      .select('id, role')
      .in('id', userIds);

    if (uError) throw uError;
    const roleByUserId = new Map<string, string>();
    for (const u of usersData ?? []) {
      roleByUserId.set(u.id, (u as { role: string }).role);
    }

    // Group tokens by retention hours
    const tokensByRetention = new Map<number, string[]>();
    for (const w of webhooks as { token: string; user_id: string }[]) {
      const role = (roleByUserId.get(w.user_id) ?? 'user') as keyof PlanConfig;
      const plan = plans[role] ?? plans.user;
      const retentionHours = getRetentionHours(plan);
      if (retentionHours <= 0) continue; // Unlimited

      const list = tokensByRetention.get(retentionHours) ?? [];
      list.push(w.token);
      tokensByRetention.set(retentionHours, list);
    }

    const timestampCol = 'timestamp'; // requests table column

    for (const [retentionHours, tokens] of tokensByRetention) {
      const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000).toISOString();
      const uniqueTokens = [...new Set(tokens)];

      const { count, error } = await supabase
        .from('requests')
        .delete({ count: 'exact' })
        .in('webhook_token', uniqueTokens)
        .lt(timestampCol, cutoff);

      if (error) {
        console.error(`Cleanup failed for retention=${retentionHours}h:`, error);
        continue;
      }
      const n = count ?? 0;
      result.deleted += n;
      result.byPlan[`${retentionHours}h`] = n;
    }

    if (result.deleted > 0) {
      console.log(`Retention cleanup: deleted ${result.deleted} old requests`, result.byPlan);
    }
  } catch (err) {
    console.error('Error in cleanupOldRequests:', err);
  }
  return result;
}

/**
 * Delete expired webhooks and their associated requests
 */
export async function cleanupExpiredWebhooks(): Promise<number> {
  try {
    const now = new Date().toISOString();
    const { count, error } = await supabase
      .from('webhooks')
      .delete({ count: 'exact' })
      .or(`expires_at.lt.${now},is_active.eq.false`);

    if (error) throw error;
    const n = count ?? 0;
    if (n > 0) console.log(`Cleaned up ${n} expired/inactive webhook(s)`);
    return n;
  } catch (err) {
    console.error('Error cleaning up expired webhooks:', err);
    return 0;
  }
}

/**
 * Start periodic retention job (for Express/dev server)
 */
export function startCleanupJob(intervalMinutes: number = 60): void {
  const run = () => {
    cleanupExpiredWebhooks().catch(console.error);
    cleanupOldRequests().catch(console.error);
  };
  run();
  setInterval(run, intervalMinutes * 60 * 1000);
  console.log(`Retention cleanup job started (every ${intervalMinutes} min)`);
}
