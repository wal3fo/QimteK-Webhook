import { useState, useEffect } from 'react';
import { X, Shield, Briefcase, User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newRole: 'user' | 'Administrator' | 'Professional') => Promise<void>;
  currentRole: 'user' | 'Administrator' | 'Professional';
  userEmail: string;
}

export default function EditRoleModal({
  isOpen,
  onClose,
  onConfirm,
  currentRole,
  userEmail
}: EditRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<'user' | 'Administrator' | 'Professional'>(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(currentRole);
      setLoading(false);
      setError(null);
    }
  }, [isOpen, currentRole]);

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

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (selectedRole === currentRole) {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(selectedRole);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
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
      aria-labelledby="role-modal-title"
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
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3
                  id="role-modal-title"
                  className="text-lg sm:text-xl font-semibold text-qimtek-text"
                >
                  🛡️ Edit User Role
                </h3>
                <p className="text-sm text-qimtek-text-secondary">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-qimtek-bg-secondary transition-colors duration-200 text-qimtek-text-secondary hover:text-qimtek-text"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-sm font-medium text-qimtek-text-secondary">
                Select Role!
              </label>

              {/* User Role */}
              <button
                type="button"
                onClick={() => setSelectedRole('user')}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                  selectedRole === 'user'
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
                {selectedRole === 'user' && <Check className="w-5 h-5" />}
              </button>

              {/* Professional Role */}
              <button
                type="button"
                onClick={() => setSelectedRole('Professional')}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                  selectedRole === 'Professional'
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
                {selectedRole === 'Professional' && <Check className="w-5 h-5" />}
              </button>

              {/* Administrator Role */}
              <button
                type="button"
                onClick={() => setSelectedRole('Administrator')}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                  selectedRole === 'Administrator'
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
                {selectedRole === 'Administrator' && <Check className="w-5 h-5" />}
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-qimtek-border bg-qimtek-bg-secondary text-qimtek-text hover:bg-qimtek-tertiary-bg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || selectedRole === currentRole}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all shadow-lg",
                  "bg-[#82c91e] hover:bg-[#6ba017] text-black",
                  (loading || selectedRole === currentRole) && "opacity-50 cursor-not-allowed shadow-none"
                )}
              >
                {loading ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
