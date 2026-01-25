import { supabase } from '../lib/supabase.js';

// Default configuration (mirrors src/config/plans.ts)
const DEFAULT_PLAN_CONFIG = {
  user: {
    displayName: 'Free',
    price: 0,
    description: 'Perfect for testing and small projects',
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
    displayName: 'Professional',
    price: 15,
    description: 'For developers and teams',
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
    displayName: 'Administrator',
    price: 0,
    description: 'Full system access',
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

// Cache
let cachedPlans: PlanConfig | null = null;
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getPlans(): Promise<PlanConfig> {
  const now = Date.now();
  if (cachedPlans && (now - lastFetch < CACHE_TTL)) {
    return cachedPlans;
  }

  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'plan_config')
      .maybeSingle();

    if (data?.value) {
      cachedPlans = data.value;
      lastFetch = now;
      return cachedPlans as PlanConfig;
    }
  } catch (err) {
    console.error('Failed to fetch plans from DB:', err);
  }

  // Fallback
  if (!cachedPlans) {
    cachedPlans = { ...DEFAULT_PLAN_CONFIG };
  }
  return cachedPlans;
}

export async function savePlans(config: PlanConfig): Promise<void> {
  cachedPlans = config;
  lastFetch = Date.now();

  const { error } = await supabase.from('system_config').upsert({
    key: 'plan_config',
    value: config,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error('Failed to save plans to DB:', error);
    throw error;
  }
  console.log('Plans updated in database');
}
