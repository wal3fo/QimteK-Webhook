import { supabase } from '../lib/supabase.js';

// Default configuration (mirrors src/config/plans.ts)
const DEFAULT_PLAN_CONFIG = {
  user: {
    maxWebhooks: 3,
    webhookExpirationHours: 72, // 72 hours for Free
    retentionHours: 24,
    features: {
      customAliases: false,
      permanentHistory: false,
      advancedInspection: false,
      requestReplay: false,
      exportData: true,
      higherRateLimits: false,
      prioritySupport: false
    }
  },
  Professional: {
    maxWebhooks: 10,
    webhookExpirationHours: 0, // 0 means never expire
    retentionHours: 0, // 0 means infinite/permanent
    features: {
      customAliases: true,
      permanentHistory: true,
      advancedInspection: true,
      requestReplay: true,
      exportData: true,
      higherRateLimits: true,
      prioritySupport: true
    }
  },
  Administrator: {
    maxWebhooks: 99999,
    webhookExpirationHours: 0,
    retentionHours: 0,
    features: {
      customAliases: true,
      permanentHistory: true,
      advancedInspection: true,
      requestReplay: true,
      exportData: true,
      higherRateLimits: true,
      prioritySupport: true
    }
  }
};

export type PlanRole = keyof typeof DEFAULT_PLAN_CONFIG;
export type PlanConfig = typeof DEFAULT_PLAN_CONFIG;

// In-memory storage for plans (replaces file-based storage)
// TODO: Migrate to a Supabase table 'system_config' or similar for persistence
let currentPlans: PlanConfig = { ...DEFAULT_PLAN_CONFIG };

export function getPlans(): PlanConfig {
  return currentPlans;
}

export function savePlans(config: PlanConfig): void {
  currentPlans = config;
  // TODO: Save to Supabase
  console.log('Plans updated in memory');
}
