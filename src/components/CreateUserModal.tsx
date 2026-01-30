import { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Lock, Shield, Briefcase, User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { email: string; password: string; role: 'user' | 'Administrator' | 'Professional' }) => Promise<void>;
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onConfirm,
}: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'Administrator' | 'Professional'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setRole('user');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await onConfirm({ email, password, role });
      // Don't close here, let parent close on success or throw on error
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className={cn(
            'bg-qimtek-bg-surface rounded-xl shadow-2xl border border-qimtek-border font-mono',
            'w-full max-w-md transform transition-all duration-300',
            'animate-scaleIn'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-qimtek-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#82c91e]/10 border border-[#82c91e]/20">
                <UserPlus className="w-5 h-5 text-[#82c91e]" />
              </div>
              <h3
                id="modal-title"
                className="text-lg sm:text-xl font-semibold text-qimtek-text"
              >
                Create New User
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-qimtek-text-secondary hover:text-qimtek-text hover:bg-qimtek-bg-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                {error}
              </div>
            )}


            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-qimtek-text-secondary mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-qimtek-text-tertiary" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-qimtek-bg-secondary border border-qimtek-border rounded-lg text-qimtek-text placeholder:text-qimtek-text-tertiary focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50 transition-all"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-qimtek-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-qimtek-text-tertiary" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-qimtek-bg-secondary border border-qimtek-border rounded-lg text-qimtek-text placeholder:text-qimtek-text-tertiary focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-qimtek-text-secondary">
                Role
              </label>

              {/* User Role */}
              <button
                type="button"
                onClick={() => setRole('user')}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                  role === 'user'
                    ? "bg-[#82c91e]/10 border-[#82c91e] text-[#82c91e]"
                    : "bg-qimtek-bg-secondary border-qimtek-border text-qimtek-text hover:border-qimtek-text-tertiary"
                )}
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">User</div>
                    <div className="text-xs opacity-80">Standard access</div>
                  </div>
                </div>
                {role === 'user' && <Check className="w-5 h-5" />}
              </button>

              {/* Professional Role */}
              <button
                type="button"
                onClick={() => setRole('Professional')}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                  role === 'Professional'
                    ? "bg-blue-500/10 border-blue-500 text-blue-400"
                    : "bg-qimtek-bg-secondary border-qimtek-border text-qimtek-text hover:border-qimtek-text-tertiary"
                )}
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">Professional</div>
                    <div className="text-xs opacity-80">Enhanced access</div>
                  </div>
                </div>
                {role === 'Professional' && <Check className="w-5 h-5" />}
              </button>

              {/* Administrator Role */}
              <button
                type="button"
                onClick={() => setRole('Administrator')}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                  role === 'Administrator'
                    ? "bg-purple-500/10 border-purple-500 text-purple-400"
                    : "bg-qimtek-bg-secondary border-qimtek-border text-qimtek-text hover:border-qimtek-text-tertiary"
                )}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">Administrator</div>
                    <div className="text-xs opacity-80">Full system access • Limit: 100 webhooks</div>
                  </div>
                </div>
                {role === 'Administrator' && <Check className="w-5 h-5" />}
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200',
                  'border border-qimtek-border bg-qimtek-bg-secondary text-qimtek-text',
                  'hover:bg-qimtek-tertiary-bg active:scale-95',
                  'touch-manipulation min-h-[44px] text-sm sm:text-base'
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200',
                  'bg-[#82c91e] hover:bg-[#6ba017] text-black',
                  'active:scale-95 shadow-lg hover:shadow-xl',
                  'touch-manipulation min-h-[44px] text-sm sm:text-base',
                  loading && 'opacity-70 cursor-wait'
                )}
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div >
      </div>
    </div >
  );
}
