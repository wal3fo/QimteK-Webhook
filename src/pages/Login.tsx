import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = isLogin
        ? await login(email, password)
        : await register(email, password);

      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-qimtek-bg flex items-center justify-center px-4 py-12 page-enter">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 slide-enter">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <p className="text-qimtek-text-secondary">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-6 sm:p-8 border border-qimtek-border card-enter">
          {/* Toggle Login/Register */}
          <div className="flex gap-2 mb-6 p-1 bg-qimtek-bg-secondary rounded-lg">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200',
                isLogin
                  ? 'bg-[#82c91e] text-black'
                  : 'text-qimtek-text-secondary hover:text-qimtek-text'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                Login
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError(null);
              }}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200',
                !isLogin
                  ? 'bg-[#82c91e] text-black'
                  : 'text-qimtek-text-secondary hover:text-qimtek-text'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" />
                Register
              </div>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="you@example.com"
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
              {!isLogin && (
                <p className="mt-1 text-xs text-qimtek-text-tertiary">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-3 px-4 bg-[#82c91e] text-black rounded-lg font-semibold',
                'hover:bg-[#6ba017] disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200 hover:scale-105 active:scale-95',
                'shadow-lg hover:shadow-xl hover:shadow-[#82c91e]/30',
                'flex items-center justify-center gap-2'
              )}
            >
              {loading ? (
                <>
                  <div className="spinner w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Account
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-qimtek-text-secondary hover:text-[#82c91e] transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
