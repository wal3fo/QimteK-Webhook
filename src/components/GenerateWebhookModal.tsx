import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (name: string) => Promise<void>;
  loading?: boolean;
}

export default function GenerateWebhookModal({ isOpen, onClose, onGenerate, loading }: GenerateWebhookModalProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerate(name);
    setName('');
    onClose();
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
                  Webhook Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Payment Notification"
                  className="w-full px-4 py-2 bg-qimtek-bg-secondary border border-qimtek-border rounded-lg text-qimtek-text focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50"
                  autoFocus
                />
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
                  disabled={loading}
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
