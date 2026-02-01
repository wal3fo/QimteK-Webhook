import { createSupabaseClient } from '../lib/supabase';

const DEFAULT_PLAN_CONFIG = {
  user: {
    displayName: 'Free',
    price: 0,
    description: 'Perfect for testing and small projects',
    maxWebhooks: 3,
    webhookExpirationHours: 72,
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

export type PlanConfig = typeof DEFAULT_PLAN_CONFIG;

let cachedPlans: PlanConfig | null = null;
let lastFetch = 0;
const CACHE_TTL = 60000;

export async function getPlans(env: any): Promise<PlanConfig> {
  const now = Date.now();
  if (cachedPlans && (now - lastFetch < CACHE_TTL)) {
    return cachedPlans;
  }

  try {
    const supabase = createSupabaseClient(env);
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

  if (!cachedPlans) {
    cachedPlans = { ...DEFAULT_PLAN_CONFIG };
  }
  return cachedPlans;
}

export async function savePlans(config: PlanConfig, env: any): Promise<void> {
  cachedPlans = config;
  lastFetch = Date.now();
  
  try {
    const supabase = createSupabaseClient(env);
    const { error } = await supabase
      .from('system_config')
      .upsert({ 
        key: 'plan_config', 
        value: config,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) throw error;
  } catch (err) {
    console.error('Failed to save plans to DB:', err);
    throw err;
  }
}
