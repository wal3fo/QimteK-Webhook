import { useState, useEffect } from 'react';
import { Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { PLAN_CONFIG } from '@/config/plans';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function PricingCards() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState(PLAN_CONFIG);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(`${API_URL}/plans`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        const data = await res.json();
        console.log('Fetched plans:', data); // Debug log
        if (data.success && data.data) {
          setPlans(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch plans', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const isFree = !user || user.role === 'user';
  const isProfessional = user?.role === 'Professional';
  const isAdministrator = user?.role === 'Administrator';

  // Helper to render feature item
  const FeatureItem = ({ included, text }: { included: boolean; text: string }) => (
    <li className={cn("flex items-start gap-2 text-sm", included ? "text-qimtek-text" : "text-qimtek-text-secondary opacity-50")}>
      {included ? (
        <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
      ) : (
        <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      )}
      <span>{text}</span>
    </li>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-[#82c91e] animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 w-full mx-auto mt-12 mb-12 font-mono">
      {/* Free Plan */}
      <div className="bg-qimtek-bg-surface rounded-xl border border-qimtek-border p-6 flex flex-col hover:border-qimtek-border-hover transition-colors">
        <div className="mb-4">
          <h3 className="text-4xl font-bold text-qimtek-text">{plans.user.displayName || 'Free'}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-qimtek-text">${plans.user.price ?? 0}</span>
            <span className="text-qimtek-text-secondary">/Lifetime</span>
          </div>
          <p className="mt-2 text-qimtek-text-secondary text-sm">{plans.user.description || 'Perfect for testing and small projects'}</p>
        </div>

        <ul className="space-y-3 mb-6 flex-1">
          <FeatureItem included={true} text={`${plans.user.maxWebhooks} Active Webhooks`} />
          <FeatureItem included={true} text={plans.user.webhookExpirationHours === 0 ? "No Webhook Expiration" : `${plans.user.webhookExpirationHours}h Webhook Expiration`} />
          <FeatureItem included={true} text={plans.user.retentionHours === 0 ? "Unlimited Request Retention" : `${plans.user.retentionHours}h Request Retention`} />

          <FeatureItem included={plans.user.features.advancedInspection} text="Advanced Inspection & Filtering" />
          <FeatureItem included={plans.user.features.exportData} text="Export Data (JSON/CSV)" />
          <FeatureItem included={plans.user.features.customAliases} text="Custom Aliases & Friendly URLs" />
          <FeatureItem included={plans.user.features.requestReplay} text="Request Replay & Redelivery" />
          <FeatureItem included={plans.user.features.higherRateLimits} text="Higher Rate Limits" />
          <FeatureItem included={plans.user.features.prioritySupport} text="Priority Support" />
        </ul>

        {authLoading ? (
          <div className="w-full h-10 bg-qimtek-bg-secondary animate-pulse rounded-lg border border-qimtek-border" />
        ) : !user ? (
          <Link
            to="/login"
            className="block w-full py-2.5 px-4 bg-qimtek-bg-secondary hover:bg-qimtek-bg-tertiary border border-qimtek-border text-qimtek-text text-center rounded-lg transition-colors text-sm font-medium"
          >
            Get Started
          </Link>
        ) : (
          <button
            disabled
            className={cn(
              "block w-full py-2.5 px-4 bg-qimtek-bg-secondary border border-qimtek-border text-qimtek-text text-center rounded-lg text-sm font-medium opacity-50 cursor-not-allowed",
              (isProfessional || isAdministrator) && "hidden"
            )}
          >
            Current Plan
          </button>
        )}
      </div>

      {/* Professional Plan */}
      <div className="bg-qimtek-bg-surface rounded-xl border border-[#82c91e]/50 p-6 flex flex-col relative overflow-hidden shadow-lg shadow-[#82c91e]/5 hover:shadow-[#82c91e]/10 transition-all">
        <div className="absolute top-0 right-0 bg-[#82c91e] text-black text-2xl font-bold px-4 py-1.5 rounded-bl-xl tracking-wide shadow-sm">
          🔥 POPULAR
        </div>

        <div className="mb-4">
          <h3 className="text-4xl font-bold text-qimtek-text">{plans.Professional.displayName || 'Professional'}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-qimtek-text">${plans.Professional.price ?? 15}</span>
            <span className="text-qimtek-text-secondary">/Lifetime</span>
          </div>
          <p className="mt-2 text-qimtek-text-secondary text-sm">{plans.Professional.description || 'For developers and teams'}</p>
        </div>

        <ul className="space-y-3 mb-6 flex-1">
          <FeatureItem included={true} text={`${plans.Professional.maxWebhooks} Active Webhooks`} />
          <FeatureItem included={true} text={plans.Professional.webhookExpirationHours === 0 ? "No Webhook Expiration" : `${plans.Professional.webhookExpirationHours}h Webhook Expiration`} />
          <FeatureItem included={true} text={plans.Professional.retentionHours === 0 ? "Unlimited Request Retention" : `${plans.Professional.retentionHours}h Request Retention`} />

          <FeatureItem included={plans.Professional.features.customAliases} text="Custom Aliases & Friendly URLs" />
          <FeatureItem included={plans.Professional.features.advancedInspection} text="Advanced Inspection & Filtering" />
          <FeatureItem included={plans.Professional.features.requestReplay} text="Request Replay & Redelivery" />
          <FeatureItem included={plans.Professional.features.exportData} text="Export Data (JSON/CSV)" />
          <FeatureItem included={plans.Professional.features.higherRateLimits} text="Higher Rate Limits" />
          <FeatureItem included={plans.Professional.features.prioritySupport} text="Priority Support" />
        </ul>

        {authLoading ? (
          <div className="w-full h-10 bg-qimtek-bg-secondary animate-pulse rounded-lg border border-qimtek-border" />
        ) : isAdministrator ? (
          null
        ) : isProfessional ? (
          <button
            disabled
            className="block w-full py-2.5 px-4 bg-[#82c91e] text-black text-center rounded-lg transition-colors text-sm font-semibold opacity-50 cursor-not-allowed"
          >
            Current Plan
          </button>
        ) : !user ? (
          <Link
            to="/login"
            className="block w-full py-2.5 px-4 bg-[#82c91e] hover:bg-[#6ba017] text-black text-center rounded-lg transition-colors text-sm font-semibold"
          >
            Upgrade Now
          </Link>
        ) : (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="block w-full py-2.5 px-4 bg-[#82c91e] hover:bg-[#6ba017] text-black text-center rounded-lg transition-colors text-sm font-semibold"
          >
            Upgrade Now
          </button>
        )}
      </div>

      {/* Payment Instruction Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
          <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">⚠️ Important Payment Instruction</h3>
            </div>

            <p className="text-qimtek-text-secondary mb-6 leading-relaxed">
              To ensure instant delivery 🚀 of your Professional plan, please make sure to use
              <span className="text-qimtek-text font-semibold"> the same email address 📧 </span>
              for the PayPal payment as your QimteK account email:
            </p>

            <div className="bg-qimtek-bg p-3 rounded-lg border border-qimtek-border mb-6 text-center">
              <span className="font-mono text-[#82c91e] text-lg">{user?.email}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 px-4 bg-qimtek-bg-secondary hover:bg-qimtek-bg-tertiary border border-qimtek-border text-qimtek-text rounded-lg transition-colors font-medium"
              >
                Cancel ❌
              </button>
              <a
                href={`https://www.paypal.com/paypalme/drgineer/${plans.Professional.price ?? 15}?currencyCode=USD`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 px-4 bg-[#82c91e] hover:bg-[#6ba017] text-black text-center rounded-lg transition-colors font-bold flex items-center justify-center gap-2"
              >
                Proceed to PayPal 💳
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
