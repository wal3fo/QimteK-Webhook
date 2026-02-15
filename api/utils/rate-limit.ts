/**
 * Rate limiting for webhook ingestion and API
 *
 * WHY: Prevents abuse and ensures Free users cannot overload the system.
 *      Uses in-memory store for single-instance; for multi-instance use KV/Redis.
 *      Cloudflare Workers: consider Durable Objects or Cloudflare Rate Limiting.
 */
import type { PlanConfig } from './plan-storage.js';

/** Sliding window: key -> { count, windowStart } */
const store = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 min

/** Clean old entries periodically */
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [k, v] of store.entries()) {
    if (v.windowStart < cutoff) store.delete(k);
  }
}, CLEANUP_INTERVAL);

function getKey(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}

/**
 * Check rate limit. Returns true if allowed, false if exceeded.
 * Uses sliding window: resets if window has passed.
 */
export function checkLimit(
  prefix: 'token' | 'ip',
  id: string,
  limit: number
): boolean {
  const key = getKey(prefix, id);
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (now - entry.windowStart >= WINDOW_MS) {
    entry = { count: 1, windowStart: now };
    store.set(key, entry);
    return true;
  }

  entry.count++;
  return entry.count <= limit;
}

/** Per-plan limits (requests per minute per token) */
const DEFAULT_TOKEN_LIMIT = 60;
const PLAN_LIMITS: Record<string, number> = {
  user: 60,
  Professional: 600,
  Administrator: 10000,
};

export function getTokenLimit(plan: PlanConfig[keyof PlanConfig] | null): number {
  if (!plan) return DEFAULT_TOKEN_LIMIT;
  const role = (plan as any).displayName === 'Professional' ? 'Professional' : 
               (plan as any).displayName === 'Administrator' ? 'Administrator' : 'user';
  return PLAN_LIMITS[role] ?? DEFAULT_TOKEN_LIMIT;
}

export const RATE_LIMIT_PER_IP = 120;
