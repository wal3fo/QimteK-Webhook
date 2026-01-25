export const PLAN_CONFIG = {
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

export type PlanRole = keyof typeof PLAN_CONFIG;
