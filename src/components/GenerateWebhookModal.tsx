import { useState, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { PLAN_CONFIG } from '@/config/plans';

interface GenerateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (name: string, alias?: string) => Promise<void>;
  loading?: boolean;
}

export default function GenerateWebhookModal({ isOpen, onClose, onGenerate, loading }: GenerateWebhookModalProps) {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const { user } = useAuth();

  const userRole = (user?.role || 'user') as keyof typeof PLAN_CONFIG;
  const canCreateAlias = PLAN_CONFIG[userRole].features.customAliases;

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setName('');
      setAlias('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerate(name, alias);
    // onClose is handled by parent or useEffect
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-qimtek-bg-surface rounded-xl shadow-2xl border border-qimtek-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-qimtek-text">Generate New Webhook</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-qimtek-bg-secondary rounded-lg transition-colors text-qimtek-text-secondary hover:text-qimtek-text"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-qimtek-text-secondary mb-1">
                  Webhook Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Payment Notification"
                  className="w-full px-4 py-2 bg-qimtek-bg-secondary border border-qimtek-border rounded-lg text-qimtek-text focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-qimtek-text-secondary mb-1">
                  Custom Alias (Optional)
                  {!canCreateAlias && <span className="text-xs text-qimtek-text-tertiary ml-2">(Pro feature)</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder={canCreateAlias ? "e.g., my-custom-hook" : "Upgrade to customize URL"}
                    className={cn(
                      "w-full px-4 py-2 bg-qimtek-bg-secondary border border-qimtek-border rounded-lg text-qimtek-text focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50",
                      !canCreateAlias && "opacity-50 cursor-not-allowed pr-10"
                    )}
                    disabled={!canCreateAlias}
                    pattern="[a-zA-Z0-9_-]{3,50}"
                    title="3-50 alphanumeric characters, hyphens, or underscores"
                  />
                  {!canCreateAlias && (
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-qimtek-text-tertiary" />
                  )}
                </div>
                {canCreateAlias && (
                  <p className="text-xs text-qimtek-text-tertiary mt-1">
                    Your URL will be: /api/webhook/{alias || '...'}
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-qimtek-bg-secondary text-qimtek-text rounded-lg hover:bg-qimtek-border transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 px-4 py-2 bg-[#82c91e] text-black rounded-lg hover:bg-[#6ba017] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
