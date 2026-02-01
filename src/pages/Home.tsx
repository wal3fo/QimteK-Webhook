import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Copy, Check, Trash2, ExternalLink, Filter, Search, Download, Clock, Globe, X, LogIn, LogOut, User, Shield, Lock, Users, CircleUser, ShieldCheck, Briefcase, Server, Activity, Plus } from 'lucide-react';
import { useWebhook } from '@/hooks/useWebhook';
import { useAuth } from '@/hooks/useAuth';
import { cn, METHOD_COLORS, METHODS } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import ConfirmModal from '@/components/ConfirmModal';
import GenerateWebhookModal from '@/components/GenerateWebhookModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import MfaSetupModal from '@/components/MfaSetupModal';
import PricingCards from '@/components/PricingCards';

import { PLAN_CONFIG } from '@/config/plans';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Home() {
  const navigate = useNavigate();
  // Disable auto-select to show dashboard
  const { webhooks, loading, error, generateWebhook, deleteWebhook, fetchWebhooks } = useWebhook({ autoSelect: false });
  const { user, token, isAuthenticated, isAdmin, logout, loading: authLoading, changePassword } = useAuth();

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [dynamicPlans, setDynamicPlans] = useState<any>(null);

  // Fetch dynamic plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_URL}/plans`);
        if (response.ok) {
          const result = await response.json() as any;
          if (result.success && result.data) {
            setDynamicPlans(result.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dynamic plans:', err);
      }
    };
    fetchPlans();
  }, []);

  // Calculate max webhooks based on role
  const maxWebhooks = useMemo(() => {
    if (!user) return 1;

    // Use dynamic plans if available, otherwise fallback to static config
    const plans = dynamicPlans || PLAN_CONFIG;

    // Handle case sensitivity or key mismatch if necessary
    // API returns 'Professional', 'user', 'Administrator' usually
    const role = user.role;

    // @ts-ignore - dynamic access
    const plan = plans[role] || plans['user'];
    return plan?.maxWebhooks || 1;
  }, [user, dynamicPlans]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleGenerate = useCallback(async (nameArg?: string | any, aliasArg?: string) => {
    let nameToUse = webhookName;
    let aliasToUse: string | undefined = undefined;

    if (typeof nameArg === 'string') {
      nameToUse = nameArg;
      aliasToUse = aliasArg;
    }

    const success = await generateWebhook(60, nameToUse, aliasToUse);
    if (success) {
      setWebhookName('');
      setShowGenerateModal(false);
    }
  }, [generateWebhook, webhookName]);

  return (
    <div className="min-h-screen bg-qimtek-bg page-enter flex flex-col">
      <SEO />
      {/* Header */}
      <div className="w-full px-0 py-4 sm:py-6 lg:py-8 slide-enter border-b border-qimtek-border">
        <div className="flex flex-row items-center justify-between gap-4 px-2 sm:px-4 lg:px-6">
          <Logo size="xl" />
          <div className="flex items-center gap-2 sm:gap-3 w-auto justify-end">
            {/* Auth Section */}
            {authLoading ? (
              <div className="h-10 w-24 bg-qimtek-bg-secondary animate-pulse rounded-lg border border-qimtek-border" />
            ) : isAuthenticated ? (
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
                {/* User Info */}
                <button
                  onClick={() => setChangePasswordModalOpen(true)}
                  className="relative flex items-center gap-2 px-2.5 py-2 lg:px-3 lg:py-2 bg-qimtek-bg-secondary hover:bg-qimtek-bg-surface border border-qimtek-border hover:border-[#82c91e]/50 text-qimtek-text-secondary hover:text-[#82c91e] rounded-lg transition-all duration-200 group cursor-pointer"
                  title="Change Password"
                >
                  <CircleUser className="w-5 h-5 lg:w-4 lg:h-4" />
                  <span className="text-sm hidden lg:inline">
                    {user?.email}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-semibold hidden lg:inline-flex items-center gap-1 border",
                    user?.role === 'Administrator' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                      user?.role === 'Professional' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-[#82c91e]/10 text-[#82c91e] border-[#82c91e]/20"
                  )}>
                    {user?.role === 'Administrator' ? 'ADMIN' : user?.role === 'Professional' ? 'PRO' : 'USER'}
                  </span>
                  {user?.role === 'Professional' && (
                    <span className="text-xs text-qimtek-text-secondary hidden xl:inline ml-1">
                      (Exp: {user.plan_expires_at ? format(new Date(user.plan_expires_at), 'MMM d, yyyy') : 'Never'})
                    </span>
                  )}
                </button>

                {/* Actions */}
                <div className="contents sm:flex sm:items-center sm:gap-2">
                  {isAdmin && (
                    <Link
                      to="/admin/users"
                      className="flex items-center gap-2 px-2.5 py-2 lg:px-3 lg:py-2 bg-qimtek-bg-secondary hover:bg-qimtek-bg-surface border border-qimtek-border hover:border-[#82c91e]/50 text-qimtek-text-secondary hover:text-[#82c91e] rounded-lg transition-all duration-200"
                      title="Server Access"
                    >
                      <Server className="w-5 h-5 lg:w-4 lg:h-4" />
                      <span className="text-sm font-medium hidden lg:inline">SERVER ACCESS</span>
                    </Link>
                  )}

                  <button
                    onClick={() => setMfaModalOpen(true)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 lg:px-3 lg:py-2 rounded-lg transition-all duration-200",
                      user?.mfa_enabled
                        ? "bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/50 text-orange-500 hover:text-orange-400"
                        : "bg-qimtek-bg-secondary hover:bg-qimtek-bg-surface border border-qimtek-border hover:border-[#82c91e]/50 text-qimtek-text-secondary hover:text-[#82c91e]"
                    )}
                    title={user?.mfa_enabled ? "Disable 2FA" : "Enable 2FA"}
                  >
                    <ShieldCheck className="w-5 h-5 lg:w-4 lg:h-4" />
                  </button>

                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-2.5 py-2 lg:px-3 lg:py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 text-red-500 hover:text-red-400 rounded-lg transition-all duration-200"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5 lg:w-4 lg:h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-qimtek-bg-secondary rounded-lg border border-qimtek-border text-qimtek-text-secondary hover:text-[#82c91e] hover:border-[#82c91e]/30 transition-all duration-200"
              >
                <LogIn className="w-4 h-4" />
                <span className="text-sm font-medium">Login</span>
              </Link>
            )}
          </div>
          <h1 className="sr-only">QimteK Hooks - Webhook Inspection Tool</h1>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl flex-1">

        {authLoading ? (
          <div className="h-64 bg-qimtek-bg-surface animate-pulse rounded-xl" />
        ) : !isAuthenticated ? (
          <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-8 border border-qimtek-border text-center">
            <h2 className="text-2xl font-bold text-qimtek-text mb-4">Login Required</h2>
            <p className="text-qimtek-text-secondary mb-6">Please login to manage your webhooks.</p>
            <Link to="/login" className="px-8 py-3 bg-[#82c91e] text-black rounded-xl font-semibold hover:bg-[#6ba017] transition-all">
              Login
            </Link>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-5 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 border border-qimtek-border card-enter">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-qimtek-text mb-3 sm:mb-4">
                Generate Webhook URL
              </h2>
              <p className="text-sm sm:text-base text-qimtek-text-secondary mb-6">
                Create a temporary webhook endpoint to receive and inspect HTTP requests
              </p>
              <div className="max-w-md mx-auto mb-4">
                <input
                  type="text"
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  placeholder="Webhook Name"
                  className="w-full px-4 py-3 bg-qimtek-bg-secondary border border-qimtek-border rounded-xl text-qimtek-text focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50 text-center placeholder:text-qimtek-text-tertiary"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !webhookName.trim()}
                className={cn(
                  'px-6 sm:px-8 py-3.5 sm:py-3.5 bg-[#82c91e] text-black rounded-xl font-semibold',
                  'hover:bg-[#6ba017] disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all duration-200 hover:scale-105 active:scale-95',
                  'shadow-lg hover:shadow-xl hover:shadow-[#82c91e]/30',
                  'text-sm sm:text-base touch-manipulation min-h-[48px] min-w-[200px]'
                )}
              >
                {loading ? 'Generating...' : 'Generate Webhook URL'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-qimtek-text">My Webhooks</h2>
                <p className="text-qimtek-text-secondary text-sm">Manage your webhook endpoints and view traffic.</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Usage Badge */}
                <div className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border',
                  webhooks.length >= maxWebhooks
                    ? 'bg-red-900/30 text-red-300 border-red-700/50'
                    : 'bg-blue-900/30 text-blue-300 border-blue-700/50'
                )}>
                  {webhooks.length} / {maxWebhooks >= 99999 ? 'Unlimited' : maxWebhooks} Used
                </div>

                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#82c91e] text-black rounded-lg font-semibold hover:bg-[#6ba017] transition-all shadow-lg shadow-[#82c91e]/20"
                >
                  <Plus className="w-4 h-4" />
                  New Webhook
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {webhooks.map(webhook => (
                <Link
                  key={webhook.token}
                  to={`/webhook/${webhook.token}`}
                  className="bg-qimtek-bg-surface p-6 rounded-xl border border-qimtek-border hover:border-[#82c91e]/50 hover:shadow-lg transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="w-24 h-24 text-[#82c91e]" />
                  </div>

                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="p-3 bg-qimtek-bg-secondary rounded-lg text-[#82c91e] group-hover:scale-110 transition-transform border border-qimtek-border">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-xs font-bold border flex items-center gap-1.5",
                      webhook.is_active !== false
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", webhook.is_active !== false ? "bg-green-400" : "bg-red-400")}></span>
                      {webhook.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                  </div>

                  <div className="relative z-10 mb-6">
                    <h3 className="text-lg font-bold text-qimtek-text mb-1 truncate" title={webhook.name}>
                      {webhook.name || 'Untitled Webhook'}
                    </h3>
                    <div className="text-xs font-mono text-qimtek-text-secondary truncate bg-qimtek-bg-secondary/50 px-2 py-1 rounded w-fit max-w-full">
                      {webhook.token}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-qimtek-border relative z-10">
                    <div>
                      <div className="text-xs text-qimtek-text-secondary mb-1">Requests</div>
                      <div className="text-lg font-bold text-qimtek-text font-mono">
                        {webhook.requestCount || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-qimtek-text-secondary mb-1">Last Active</div>
                      <div className="text-sm font-medium text-qimtek-text truncate" title={webhook.lastActive ? format(new Date(webhook.lastActive), 'PPpp') : 'Never'}>
                        {webhook.lastActive
                          ? format(new Date(webhook.lastActive), 'MMM d, HH:mm')
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <PricingCards />
      </div>
      <Footer />

      <GenerateWebhookModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        loading={loading}
        error={error}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        onConfirm={async (data) => {
          await changePassword(data);
          setChangePasswordModalOpen(false);
        }}
      />

      <MfaSetupModal
        isOpen={mfaModalOpen}
        onClose={() => setMfaModalOpen(false)}
      />
    </div>
  );
}
