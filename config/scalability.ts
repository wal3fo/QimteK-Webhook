/**
 * Scalability configuration - plan-based limits and retention
 *
 * WHY: Centralized config ensures backend, workers, and cron jobs use
 *      consistent limits. Avoids magic numbers scattered across codebase.
 */

export type PlanRole = 'user' | 'Professional' | 'Administrator';

/** Retention in hours. 0 = unlimited. */
export const RETENTION_BY_PLAN: Record<PlanRole, number> = {
  user: 24,        // Free: 24 hours
  Professional: 0, // Pro: unlimited (0 = no auto-delete)
  Administrator: 0,
};

/** Default retention for Pro when configurable (in days). 0 = unlimited. */
export const DEFAULT_PRO_RETENTION_DAYS = 90;

/** Rate limits: requests per minute per webhook token */
export const RATE_LIMIT_BY_PLAN: Record<PlanRole, number> = {
  user: 60,         // Free: 60 req/min per token
  Professional: 600, // Pro: 600 req/min
  Administrator: 10000,
};

/** Rate limits: requests per minute per IP (global) */
export const RATE_LIMIT_PER_IP = 120;

/** Max webhook tokens per user (enforced at DB/API) */
export const MAX_WEBHOOKS_BY_PLAN: Record<PlanRole, number> = {
  user: 3,
  Professional: 10,
  Administrator: 99999,
};
