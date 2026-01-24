import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PricingCards() {
  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12 mb-12">
      {/* Free Plan */}
      <div className="bg-qimtek-bg-surface rounded-xl border border-qimtek-border p-6 flex flex-col hover:border-qimtek-border-hover transition-colors">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-qimtek-text">Free</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-qimtek-text">$0</span>
            <span className="text-qimtek-text-secondary">/month</span>
          </div>
          <p className="mt-2 text-qimtek-text-secondary text-sm">Perfect for testing and small projects</p>
        </div>
        
        <ul className="space-y-3 mb-6 flex-1">
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>1 Active Webhook</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Real-time inspection</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Basic request details</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text-secondary opacity-50">
             <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
             <span>Multiple Webhooks</span>
          </li>
        </ul>

        <Link 
          to="/login" 
          className="block w-full py-2.5 px-4 bg-qimtek-bg-secondary hover:bg-qimtek-bg-tertiary border border-qimtek-border text-qimtek-text text-center rounded-lg transition-colors text-sm font-medium"
        >
          Get Started
        </Link>
      </div>

      {/* Professional Plan */}
      <div className="bg-qimtek-bg-surface rounded-xl border border-[#82c91e]/50 p-6 flex flex-col relative overflow-hidden shadow-lg shadow-[#82c91e]/5 hover:shadow-[#82c91e]/10 transition-all">
        <div className="absolute top-0 right-0 bg-[#82c91e] text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wide">
          POPULAR
        </div>
        
        <div className="mb-4">
          <h3 className="text-xl font-bold text-qimtek-text">Professional</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-qimtek-text">$29</span>
            <span className="text-qimtek-text-secondary">/month</span>
          </div>
          <p className="mt-2 text-qimtek-text-secondary text-sm">For developers and teams</p>
        </div>

        <ul className="space-y-3 mb-6 flex-1">
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>5 Active Webhooks</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Priority Support</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Advanced Analytics</span>
          </li>
           <li className="flex items-start gap-2 text-sm text-qimtek-text">
            <Check className="w-4 h-4 text-[#82c91e] mt-0.5 shrink-0" />
            <span>Extended History</span>
          </li>
        </ul>

        <Link 
          to="/login"
          className="block w-full py-2.5 px-4 bg-[#82c91e] hover:bg-[#6ba017] text-black text-center rounded-lg transition-colors text-sm font-semibold"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}
