import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export default function PricingCards() {
  const { user } = useAuth();

  const isFree = !user || user.role === 'user';
  const isProfessional = user?.role === 'Professional';
  const isAdministrator = user?.role === 'Administrator';

  return (
    <div className="grid md:grid-cols-2 gap-6 w-full mx-auto mt-12 mb-12">
      {/* Free Plan */}
      <div className="bg-qimtek-bg-surface rounded-xl border border-qimtek-border p-6 flex flex-col hover:border-qimtek-border-hover transition-colors">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-qimtek-text">Free</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-qimtek-text">$0</span>
            <span className="text-qimtek-text-secondary">/Lifetime</span>
          </div>
          <p className="mt-2 text-qimtek-text-secondary text-sm">Perfect for testing and small projects</p>
        </div>

        <ul className="space-y-3 mb-6 flex-1">
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>3 Active Webhooks</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>72h Webhook Expiration</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>24h Request Retention</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Standard Inspection</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Export Data (JSON/CSV)</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text-secondary opacity-50">
            <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span>Custom Aliases & Friendly URLs</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text-secondary opacity-50">
            <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span>Request Replay & Redelivery</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text-secondary opacity-50">
            <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span>Higher Rate Limits</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text-secondary opacity-50">
            <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span>Priority Support</span>
          </li>
        </ul>

        {!user ? (
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
        <div className="absolute top-0 right-0 bg-[#82c91e] text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wide">
          POPULAR
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold text-qimtek-text">Professional</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-qimtek-text">$15</span>
            <span className="text-qimtek-text-secondary">/Lifetime</span>
          </div>
          <p className="mt-2 text-qimtek-text-secondary text-sm">For developers and teams</p>
        </div>

        <ul className="space-y-3 mb-6 flex-1">
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>10 Active Webhooks</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>No Webhook Expiration</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Unlimited Requests</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Custom Aliases & Friendly URLs</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Advanced Inspection & Filtering</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Request Replay & Redelivery</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Export Data (JSON/CSV)</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Higher Rate Limits</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Priority Support</span>
          </li>
        </ul>

        {isAdministrator ? (
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
          <a
            href="https://www.paypal.com/paypalme/drgineer/15?currencyCode=USD"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2.5 px-4 bg-[#82c91e] hover:bg-[#6ba017] text-black text-center rounded-lg transition-colors text-sm font-semibold"
          >
            Upgrade Now
          </a>
        )}
      </div>
    </div>
  );
}
