import { useState, useEffect } from 'react';
import { X, Shield, Check, Copy, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface MfaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function MfaSetupModal({
  isOpen,
  onClose,
  onComplete
}: MfaSetupModalProps) {
  const { user, token, checkSession } = useAuth();
  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'success' | 'disable_confirm' | 'disable_success'>('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep(user?.mfa_enabled ? 'disable_confirm' : 'initial');
      setLoading(false);
      setError(null);
      setVerificationCode('');
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/mfa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json() as any;

      if (data.success) {
        setSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
        setStep('setup');
      } else {
        setError(data.error || 'Failed to start MFA setup');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/mfa/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: verificationCode, secret })
      });
      const data = await response.json() as any;

      if (data.success) {
        setStep('success');
        checkSession(); // Refresh user state
        setTimeout(() => {
          onClose();
          onComplete?.();
        }, 2000);
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/mfa/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json() as any;

      if (data.success) {
        setStep('disable_success');
        checkSession(); // Refresh user state
        setTimeout(() => {
          onClose();
          onComplete?.();
        }, 2000);
      } else {
        setError(data.error || 'Failed to disable MFA');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
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
          <div className="flex items-center justify-between p-6 border-b border-qimtek-border">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg border",
                user?.mfa_enabled
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-purple-500/10 border-purple-500/20"
              )}>
                {user?.mfa_enabled
                  ? <ShieldCheck className="w-5 h-5 text-green-500" />
                  : <Shield className="w-5 h-5 text-purple-500" />
                }
              </div>
              <div>
                <h2 className="text-lg font-semibold text-qimtek-text">🛡️ Two-Factor Authentication</h2>
                <p className="text-xs text-qimtek-text-secondary">
                  {user?.mfa_enabled ? 'MFA is currently enabled' : 'Secure your account'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-qimtek-text-secondary hover:text-qimtek-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'initial' && (
              <div className="space-y-4">
                <p className="text-qimtek-text-secondary">
                  Two-factor authentication adds an extra layer of security to your account.
                  You will need to use an authenticator app like Google Authenticator or Authy.
                </p>
                <button
                  onClick={startSetup}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '⚡ Setup MFA'}
                </button>
              </div>
            )}

            {step === 'disable_confirm' && (
              <div className="space-y-4">
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-400">
                    Disabling Two-Factor Authentication (2FA) will reduce the security of your account. Once disabled, you will only need your password to log in.
                  </div>
                </div>

                <p className="text-qimtek-text-secondary">
                  Are you sure you want to disable Two-Factor Authentication?
                </p>

                <button
                  onClick={disableMfa}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🚫 Disable 2FA'}
                </button>
              </div>
            )}

            {step === 'setup' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-2 rounded-lg">
                    <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-qimtek-text-secondary mb-2">
                      Scan this QR code with your authenticator app
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-qimtek-bg rounded border border-qimtek-border">
                      <code className="text-xs font-mono text-qimtek-text">{secret}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(secret)}
                        className="text-qimtek-text-secondary hover:text-qimtek-text"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <form onSubmit={verifyAndEnable} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-qimtek-text-secondary mb-1">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full px-3 py-2 bg-qimtek-bg border border-qimtek-border rounded-lg text-qimtek-text focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
                  </button>
                </form>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center py-6 text-center animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-qimtek-text mb-2">🎉 MFA Enabled!</h3>
                <p className="text-qimtek-text-secondary">
                  Your account is now secured with two-factor authentication.
                </p>
              </div>
            )}

            {step === 'disable_success' && (
              <div className="flex flex-col items-center py-6 text-center animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-medium text-qimtek-text mb-2">🔓 MFA Disabled</h3>
                <p className="text-qimtek-text-secondary">
                  Two-factor authentication has been disabled for your account.
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function onComplete() {
  throw new Error('Function not implemented.');
}

