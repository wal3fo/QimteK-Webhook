/**
 * Project Configuration
 * 
 * Centralized configuration for the application.
 */

export const PLAN_CONFIG = {
  user: {
    maxWebhooks: 3,
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

export const WEBHOOK_LIMITS = {
  USER: PLAN_CONFIG.user.maxWebhooks,
  PROFESSIONAL: PLAN_CONFIG.Professional.maxWebhooks,
  ADMIN: PLAN_CONFIG.Administrator.maxWebhooks,
};
