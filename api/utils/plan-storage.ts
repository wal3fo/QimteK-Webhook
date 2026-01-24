import fs from 'fs';
import path from 'path';

const PLAN_FILE = 'plans.json';

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

function getPlanFilePath(): string {
  // Use DB_PATH logic or just cwd
  return path.join(process.cwd(), PLAN_FILE);
}

export function getPlans(): PlanConfig {
  const filePath = getPlanFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      // Merge with default to ensure all keys exist (in case of updates)
      return { ...DEFAULT_PLAN_CONFIG, ...parsed };
    }
  } catch (error) {
    console.error('Error reading plans file:', error);
  }
  return DEFAULT_PLAN_CONFIG;
}

export function savePlans(config: PlanConfig): void {
  const filePath = getPlanFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing plans file:', error);
    throw new Error('Failed to save plan configuration');
  }
}
