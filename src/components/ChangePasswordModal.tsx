import { useState, useEffect } from 'react';
import { X, Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
}

export default function ChangePasswordModal({ isOpen, onClose, onConfirm }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }
    if (!confirmNewPassword) {
      newErrors.confirmNewPassword = 'Confirm new password is required';
    } else if (confirmNewPassword !== newPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        await onConfirm({ currentPassword, newPassword });
        onClose();
      } catch (error) {
        if (error instanceof Error) {
          setErrors({ submit: error.message });
        } else {
          setErrors({ submit: 'An unexpected error occurred' });
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-qimtek-bg-surface rounded-xl shadow-lg border border-qimtek-border w-full max-w-md max-h-[90vh] overflow-y-auto font-mono">
        <div className="p-6 border-b border-qimtek-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-qimtek-text">🔒 Change Password</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-qimtek-bg-secondary transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-qimtek-text-secondary" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.submit && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-2 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-qimtek-text-secondary mb-2">
              🔑 Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-qimtek-text-tertiary" />
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isSubmitting}
                className={cn(
                  "w-full pl-10 pr-4 py-3 bg-qimtek-bg-secondary border rounded-lg text-qimtek-text placeholder:text-qimtek-text-tertiary focus:outline-none focus:ring-2 transition-all",
                  errors.currentPassword ? "border-red-800 focus:ring-red-500/50" : "border-qimtek-border focus:ring-[#82c91e]/50",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
                placeholder="••••••••"
              />
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.currentPassword}</p>
            )}
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-qimtek-text-secondary mb-2">
              ✨ New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-qimtek-text-tertiary" />
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                className={cn(
                  "w-full pl-10 pr-4 py-3 bg-qimtek-bg-secondary border rounded-lg text-qimtek-text placeholder:text-qimtek-text-tertiary focus:outline-none focus:ring-2 transition-all",
                  errors.newPassword ? "border-red-800 focus:ring-red-500/50" : "border-qimtek-border focus:ring-[#82c91e]/50",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
                placeholder="••••••••"
              />
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.newPassword}</p>
            )}
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-qimtek-text-secondary mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-qimtek-text-tertiary" />
              <input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={isSubmitting}
                className={cn(
                  "w-full pl-10 pr-4 py-3 bg-qimtek-bg-secondary border rounded-lg text-qimtek-text placeholder:text-qimtek-text-tertiary focus:outline-none focus:ring-2 transition-all",
                  errors.confirmNewPassword ? "border-red-800 focus:ring-red-500/50" : "border-qimtek-border focus:ring-[#82c91e]/50",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
                placeholder="••••••••"
              />
            </div>
            {errors.confirmNewPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.confirmNewPassword}</p>
            )}
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#82c91e] text-black rounded-lg font-semibold transition-all duration-200 hover:bg-[#6ba017] hover:scale-105 active:scale-95",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}