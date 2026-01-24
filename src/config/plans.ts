export const PLAN_CONFIG = {
  user: {
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
    maxWebhooks: 10,
    webhookExpirationHours: 0,
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

export type PlanRole = keyof typeof PLAN_CONFIG;
