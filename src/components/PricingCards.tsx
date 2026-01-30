import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { PLAN_CONFIG } from '@/config/plans';
import ConfirmModal from './ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function PricingCards() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState(PLAN_CONFIG);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDanger: boolean;
    type: 'success' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDanger: false,
    type: 'success'
  });

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

  const FEATURE_DEFINITIONS = [
    { key: 'advancedInspection', label: 'Advanced Inspection & Filtering' },
    { key: 'exportData', label: 'Export Data (JSON/CSV)' },
    { key: 'customAliases', label: 'Custom Aliases & Friendly URLs' },
    { key: 'requestReplay', label: 'Request Replay & Redelivery' },
    { key: 'higherRateLimits', label: 'Higher Rate Limits' },
    { key: 'prioritySupport', label: 'Priority Support' },
  ] as const;

  const renderFeatures = (planFeatures: any) => {
    return FEATURE_DEFINITIONS
      .map(def => ({
        ...def,
        included: planFeatures[def.key]
      }))
      .sort((a, b) => {
        if (a.included === b.included) return 0;
        return a.included ? -1 : 1;
      })
      .map(f => (
        <FeatureItem key={f.key} included={f.included} text={f.label} />
      ));
  };

  useEffect(() => {
    if (showPaymentModal) {
      document.body.style.overflow = 'hidden';

      // Polling to ensure PayPal SDK is loaded
      const intervalId = setInterval(() => {
        if ((window as any).paypal && (window as any).paypal.Buttons) {
          clearInterval(intervalId);
          try {
            // Clear previous buttons if any
            const container = document.getElementById("paypal-container-YATY56ANEDQYJ");
            if (container) container.innerHTML = "";

            (window as any).paypal.Buttons({
              style: {
                shape: 'rect',
                color: 'gold',
                layout: 'vertical',
                label: 'pay',
              },
              createOrder: (_data: any, actions: any) => {
                return actions.order.create({
                  purchase_units: [{
                    amount: {
                      value: plans.Professional.price?.toString() || '15.00'
                    },
                    description: 'Professional Plan (1 Year)'
                  }]
                });
              },
              onApprove: async (_data: any, actions: any) => {
                try {
                  const order = await actions.order.capture();
                  console.log('PayPal Order Captured:', order);

                  const res = await fetch(`${API_URL}/payments/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderID: order.id,
                      plan: 'PROFESSIONAL',
                      email: order.payer.email_address,
                      userId: user?.id
                    })
                  });

                  const result = await res.json();
                  if (result.success) {
                    setShowPaymentModal(false);
                    setStatusModal({
                      isOpen: true,
                      title: 'Payment Successful!',
                      message: 'Your license has been activated successfully. Enjoy the Professional plan! 🚀',
                      isDanger: false,
                      type: 'success'
                    });
                  } else {
                    setShowPaymentModal(false);
                    setStatusModal({
                      isOpen: true,
                      title: 'Verification Failed',
                      message: result.error || 'Unknown error occurred during verification.',
                      isDanger: true,
                      type: 'error'
                    });
                  }
                } catch (err) {
                  console.error('Payment Error:', err);
                  setShowPaymentModal(false);
                  setStatusModal({
                    isOpen: true,
                    title: 'Payment Error',
                    message: 'Payment failed to process. Please contact support.',
                    isDanger: true,
                    type: 'error'
                  });
                }
              },
              onError: (err: any) => {
                console.error('PayPal Error:', err);
                setShowPaymentModal(false);
                setStatusModal({
                  isOpen: true,
                  title: 'PayPal Error',
                  message: 'PayPal encountered an error. Please try again.',
                  isDanger: true,
                  type: 'error'
                });
              }
            }).render("#paypal-container-YATY56ANEDQYJ");
          } catch (err) {
            console.error("PayPal render error:", err);
          }
        }
      }, 500);

      // Timeout after 10 seconds
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
      }, 10000);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        document.body.style.overflow = 'unset';
      };
    }
  }, [showPaymentModal]);

  const handleStatusModalClose = () => {
    setStatusModal(prev => ({ ...prev, isOpen: false }));
    if (statusModal.type === 'success') {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-[#82c91e] animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 md:gap-6 w-full mx-auto mt-8 md:mt-12 mb-12 font-mono">
      {/* Free Plan */}
      <div className="bg-qimtek-bg-surface rounded-xl border border-qimtek-border p-4 md:p-6 flex flex-col hover:border-qimtek-border-hover transition-colors">
        <div className="mb-4">
          <h3 className="text-3xl md:text-4xl font-bold text-qimtek-text">{plans.user.displayName || 'Free'}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl md:text-3xl font-bold text-qimtek-text">${plans.user.price ?? 0}</span>
            <span className="text-qimtek-text-secondary">/Lifetime</span>
          </div>
          <p className="mt-2 text-qimtek-text-secondary text-sm">{plans.user.description || 'Perfect for testing and small projects'}</p>
        </div>

        <ul className="space-y-3 mb-6 flex-1">
          <FeatureItem included={true} text={`${plans.user.maxWebhooks} Active Webhooks`} />
          <FeatureItem included={true} text={plans.user.webhookExpirationHours === 0 ? "No Webhook Expiration" : `${plans.user.webhookExpirationHours}h Webhook Expiration`} />
          <FeatureItem included={true} text={plans.user.retentionHours === 0 ? "Unlimited Request Retention" : `${plans.user.retentionHours}h Request Retention`} />

          {renderFeatures(plans.user.features)}
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
      <div className="bg-qimtek-bg-surface rounded-xl border border-[#82c91e]/50 p-4 md:p-6 flex flex-col relative overflow-hidden shadow-lg shadow-[#82c91e]/5 hover:shadow-[#82c91e]/10 transition-all">
        <div className="absolute top-0 right-0 bg-[#82c91e] text-black text-xs px-3 py-1 md:text-xl md:px-4 md:py-1.5 font-bold rounded-bl-xl tracking-wide shadow-sm">
          🔥 POPULAR
        </div>

        <div className="mb-4">
          <h3 className="text-3xl md:text-4xl font-bold text-qimtek-text">{plans.Professional.displayName || 'Professional'}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl md:text-3xl font-bold text-qimtek-text">${plans.Professional.price ?? 15}</span>
            <span className="text-qimtek-text-secondary">/Year</span>
          </div>
          <p className="mt-2 text-qimtek-text-secondary text-sm">{plans.Professional.description || 'For developers and teams'}</p>
        </div>

        <ul className="space-y-3 mb-6 flex-1">
          <FeatureItem included={true} text={`${plans.Professional.maxWebhooks} Active Webhooks`} />
          <FeatureItem included={true} text={plans.Professional.webhookExpirationHours === 0 ? "No Webhook Expiration" : `${plans.Professional.webhookExpirationHours}h Webhook Expiration`} />
          <FeatureItem included={true} text={plans.Professional.retentionHours === 0 ? "Unlimited Request Retention" : `${plans.Professional.retentionHours}h Request Retention`} />

          {renderFeatures(plans.Professional.features)}
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
      {showPaymentModal && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm font-mono">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl max-w-md w-full p-4 md:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-qimtek-text mb-6 text-center">Complete Your Purchase</h3>

              <div id="paypal-container-YATY56ANEDQYJ" className="mb-4 min-h-[50px] w-full z-0"></div>

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 px-4 bg-qimtek-bg-secondary hover:bg-qimtek-bg-tertiary border border-qimtek-border text-qimtek-text rounded-lg transition-colors font-medium"
                >
                  Cancel ❌
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Status Modal */}
      <ConfirmModal
        isOpen={statusModal.isOpen}
        onClose={handleStatusModalClose}
        onConfirm={handleStatusModalClose}
        title={statusModal.title}
        message={statusModal.message}
        isDanger={statusModal.isDanger}
        confirmText={statusModal.type === 'success' ? 'Great!' : 'Close'}
        cancelText={null}
      />
    </div>
  );
}
