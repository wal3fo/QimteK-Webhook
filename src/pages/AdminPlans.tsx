
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Shield, Clock, Database, RefreshCw, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface PlanConfig {
  maxWebhooks: number;
  webhookExpirationHours: number;
  retentionHours: number;
  features: {
    customAliases: boolean;
    retryRequests: boolean;
    emailNotifications: boolean;
    exportData: boolean;
  };
}

interface Plans {
  user: PlanConfig;
  Professional: PlanConfig;
  Administrator: PlanConfig;
}

export default function AdminPlans() {
  const navigate = useNavigate();
  const { user, token, isAdmin } = useAuth();
  const [plans, setPlans] = useState<Plans | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/plans`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }

      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin) {
      fetchPlans();
    }
  }, [isAdmin, fetchPlans]);

  const handleSave = async () => {
    if (!plans || !token) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/plans`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plans })
      });

      if (!response.ok) {
        throw new Error('Failed to update plans');
      }

      const data = await response.json();
      if (data.success) {
        setSuccess('Plans updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plans');
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = (role: keyof Plans, field: keyof PlanConfig, value: number) => {
    if (!plans) return;
    setPlans({
      ...plans,
      [role]: {
        ...plans[role],
        [field]: value
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-qimtek-bg flex items-center justify-center">
        <p className="text-qimtek-text-secondary">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-qimtek-bg flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b border-qimtek-border bg-qimtek-bg/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin/users" className="p-2 -ml-2 hover:bg-qimtek-bg-secondary rounded-lg transition-colors text-qimtek-text-secondary hover:text-qimtek-text">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="h-6 w-px bg-qimtek-border mx-2" />
              <Logo />
              <div className="ml-4 px-3 py-1 bg-[#82c91e]/10 border border-[#82c91e]/20 rounded-full">
                <span className="text-xs font-semibold text-[#82c91e] tracking-wide uppercase">Admin Area</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 bg-[#82c91e] text-black rounded-lg font-medium transition-all hover:bg-[#6ba017] disabled:opacity-50",
                  saving && "cursor-wait"
                )}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-qimtek-text mb-2">Plan Configuration</h1>
              <p className="text-qimtek-text-secondary">Manage limits and expiration policies for each user tier.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                {success}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#82c91e]"></div>
              </div>
            ) : plans ? (
              <div className="grid gap-6">
                {/* Free Plan */}
                <div className="bg-qimtek-bg-surface rounded-xl border border-qimtek-border overflow-hidden">
                  <div className="p-4 border-b border-qimtek-border bg-qimtek-bg-secondary/50 flex items-center gap-3">
                    <User className="w-5 h-5 text-qimtek-text-secondary" />
                    <h2 className="font-semibold text-qimtek-text">Free User Plan</h2>
                  </div>
                  <div className="p-6 grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-qimtek-text-secondary mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Expiration (Hours)
                      </label>
                      <input
                        type="number"
                        value={plans.user.webhookExpirationHours}
                        onChange={(e) => updatePlan('user', 'webhookExpirationHours', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-qimtek-bg border border-qimtek-border rounded-lg text-qimtek-text focus:border-[#82c91e] focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-qimtek-text-tertiary">0 = Never expire</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-qimtek-text-secondary mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Max Webhooks
                      </label>
                      <input
                        type="number"
                        value={plans.user.maxWebhooks}
                        onChange={(e) => updatePlan('user', 'maxWebhooks', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-qimtek-bg border border-qimtek-border rounded-lg text-qimtek-text focus:border-[#82c91e] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Plan */}
                <div className="bg-qimtek-bg-surface rounded-xl border border-blue-500/20 overflow-hidden">
                  <div className="p-4 border-b border-blue-500/20 bg-blue-500/5 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <h2 className="font-semibold text-blue-400">Professional Plan</h2>
                  </div>
                  <div className="p-6 grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-qimtek-text-secondary mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Expiration (Hours)
                      </label>
                      <input
                        type="number"
                        value={plans.Professional.webhookExpirationHours}
                        onChange={(e) => updatePlan('Professional', 'webhookExpirationHours', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-qimtek-bg border border-qimtek-border rounded-lg text-qimtek-text focus:border-[#82c91e] focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-qimtek-text-tertiary">0 = Never expire</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-qimtek-text-secondary mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Max Webhooks
                      </label>
                      <input
                        type="number"
                        value={plans.Professional.maxWebhooks}
                        onChange={(e) => updatePlan('Professional', 'maxWebhooks', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-qimtek-bg border border-qimtek-border rounded-lg text-qimtek-text focus:border-[#82c91e] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Administrator Plan */}
                <div className="bg-qimtek-bg-surface rounded-xl border border-purple-500/20 overflow-hidden">
                  <div className="p-4 border-b border-purple-500/20 bg-purple-500/5 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <h2 className="font-semibold text-purple-400">Administrator Plan</h2>
                  </div>
                  <div className="p-6 grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-qimtek-text-secondary mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Expiration (Hours)
                      </label>
                      <input
                        type="number"
                        value={plans.Administrator.webhookExpirationHours}
                        onChange={(e) => updatePlan('Administrator', 'webhookExpirationHours', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-qimtek-bg border border-qimtek-border rounded-lg text-qimtek-text focus:border-[#82c91e] focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-qimtek-text-tertiary">0 = Never expire</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-qimtek-text-secondary mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Max Webhooks
                      </label>
                      <input
                        type="number"
                        value={plans.Administrator.maxWebhooks}
                        onChange={(e) => updatePlan('Administrator', 'maxWebhooks', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-qimtek-bg border border-qimtek-border rounded-lg text-qimtek-text focus:border-[#82c91e] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
