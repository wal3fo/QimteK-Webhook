import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Copy, Check, Trash2, ExternalLink, Filter, Search, Download, Clock, Globe, X, LogIn, LogOut, User, Shield, Lock, Users, CircleUser, ShieldCheck, KeyRound } from 'lucide-react';
import { useWebhook } from '@/hooks/useWebhook';
import { useAuth } from '@/hooks/useAuth';
import { cn, METHOD_COLORS, METHODS } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import ConfirmModal from '@/components/ConfirmModal';
import GenerateWebhookModal from '@/components/GenerateWebhookModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import MfaSetupModal from '@/components/MfaSetupModal';
import WebhookSelector from '@/components/WebhookSelector';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Helper to safely format dates
const safeFormatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, 'PPp');
  } catch (e) {
    return 'Invalid Date';
  }
};

// Mobile Request Card Component
const RequestCard = memo(({ request, onNavigate }: { request: any; onNavigate: (id: string) => void }) => (
  <div
    onClick={() => onNavigate(request.id)}
    className="bg-qimtek-bg-secondary rounded-xl p-4 border border-qimtek-border hover:border-[#82c91e]/50 transition-all duration-300 cursor-pointer active:scale-[0.98] hover:shadow-lg hover:shadow-[#82c91e]/10 touch-manipulation"
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <span
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
          METHOD_COLORS[request.method?.toUpperCase()] || 'bg-qimtek-bg text-qimtek-text border border-qimtek-border'
        )}
      >
        {request.method?.toUpperCase()}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(request.id);
        }}
        className="text-[#82c91e] hover:text-[#6ba017] transition-colors font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-[#82c91e]/10 touch-manipulation min-h-[44px]"
        aria-label="View request details"
      >
        View →
      </button>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-qimtek-text-secondary">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">{safeFormatDate(request.timestamp)}</span>
      </div>
      {request.ip_address && (
        <div className="flex items-center gap-2 text-sm text-qimtek-text-secondary">
          <Globe className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-mono break-all">{request.ip_address}</span>
        </div>
      )}
    </div>
  </div>
));

RequestCard.displayName = 'RequestCard';

// Desktop Request Row Component
const RequestRow = memo(({ request, onNavigate }: { request: any; onNavigate: (id: string) => void }) => (
  <tr
    className="hover:bg-qimtek-bg-secondary transition-all duration-200 cursor-pointer group"
    onClick={() => onNavigate(request.id)}
  >
    <td className="px-6 py-4 whitespace-nowrap text-center">
      <span
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
          METHOD_COLORS[request.method?.toUpperCase()] || 'bg-qimtek-bg-secondary text-qimtek-text border border-qimtek-border'
        )}
      >
        {request.method?.toUpperCase()}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-qimtek-text text-center">
      {safeFormatDate(request.timestamp)}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-qimtek-text-secondary font-mono text-center">
      {request.ip_address || 'N/A'}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(request.id);
        }}
        className="text-[#82c91e] hover:text-[#6ba017] transition-colors font-medium group-hover:underline"
      >
        View Details
      </button>
    </td>
  </tr>
));

RequestRow.displayName = 'RequestRow';

export default function Home() {
  const navigate = useNavigate();
  const { webhooks, selectedWebhook, requests, loading, error, isConnected, generateWebhook, deleteWebhook, setSelectedWebhook } = useWebhook();
  const { user, token, isAuthenticated, isAdmin, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState('');

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleChangePassword = async (data: { currentPassword: string; newPassword: string }) => {
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      // Success is handled by the modal closing
    } catch (error) {
      throw error; // Re-throw so modal can display error
    }
  };

  // Memoized handlers
  const handleGenerate = useCallback(async (arg?: any) => {
    const nameToUse = typeof arg === 'string' ? arg : webhookName;
    await generateWebhook(60, nameToUse);
    setWebhookName('');
  }, [generateWebhook, webhookName]);

  const handleCopy = useCallback(async () => {
    if (!selectedWebhook) return;
    try {
      await navigator.clipboard.writeText(selectedWebhook.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [selectedWebhook]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (selectedWebhook) {
      await deleteWebhook(selectedWebhook.token);
      setShowDeleteModal(false);
    }
  }, [deleteWebhook, selectedWebhook]);

  const handleNavigate = useCallback((id: string) => {
    navigate(`/request/${id}`);
  }, [navigate]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  // Memoized filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (methodFilter !== 'ALL' && req.method !== methodFilter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const bodyStr = JSON.stringify(req.body || {}).toLowerCase();
        const headersStr = JSON.stringify(req.headers || {}).toLowerCase();
        return bodyStr.includes(query) || headersStr.includes(query);
      }
      return true;
    });
  }, [requests, methodFilter, searchQuery]);

  const exportRequests = useCallback(() => {
    const dataStr = JSON.stringify(filteredRequests, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `webhook-requests-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredRequests]);

  return (
    <div className="min-h-screen bg-qimtek-bg page-enter flex flex-col">
      {/* Header */}
      <div className="w-full px-0 py-4 sm:py-6 lg:py-8 slide-enter border-b border-qimtek-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-4 lg:px-6">
          <Logo size="xl" />
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {/* User Info */}
                <div className="relative flex items-center gap-2 px-2.5 py-2 lg:px-3 lg:py-2 bg-qimtek-bg-secondary rounded-lg border border-qimtek-border group">
                  <CircleUser className="w-5 h-5 lg:w-4 lg:h-4" />
                  <span className="text-sm hidden lg:inline">
                    {user?.email}
                  </span>
                  {isAdmin && (
                    <span className="px-2 py-0.5 bg-[#82c91e]/20 text-[#82c91e] rounded text-xs font-semibold hidden lg:inline-block">
                      Admin
                    </span>
                  )}
                  {isAdmin && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#82c91e] lg:hidden ring-2 ring-qimtek-bg-secondary" title="Admin"></span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {isAdmin && (
                    <Link
                      to="/admin/users"
                      className="flex items-center gap-2 px-2.5 py-2 lg:px-3 lg:py-2 bg-qimtek-bg-secondary hover:bg-qimtek-bg-surface border border-qimtek-border hover:border-[#82c91e]/50 text-qimtek-text-secondary hover:text-[#82c91e] rounded-lg transition-all duration-200"
                      title="Manage Users"
                    >
                      <Users className="w-5 h-5 lg:w-4 lg:h-4" />
                      <span className="hidden lg:inline text-sm font-medium">Users</span>
                    </Link>
                  )}

                  <button
                    onClick={() => setMfaModalOpen(true)}
                    className="flex items-center gap-2 px-2.5 py-2 lg:px-3 lg:py-2 bg-qimtek-bg-secondary hover:bg-qimtek-bg-surface border border-qimtek-border hover:border-[#82c91e]/50 text-qimtek-text-secondary hover:text-[#82c91e] rounded-lg transition-all duration-200"
                    title="2FA Setup"
                  >
                    <ShieldCheck className="w-5 h-5 lg:w-4 lg:h-4" />
                    <span className="hidden lg:inline text-sm font-medium">2FA</span>
                  </button>

                  <button
                    onClick={() => setChangePasswordModalOpen(true)}
                    className="flex items-center gap-2 px-2.5 py-2 lg:px-3 lg:py-2 bg-qimtek-bg-secondary hover:bg-qimtek-bg-surface border border-qimtek-border hover:border-[#82c91e]/50 text-qimtek-text-secondary hover:text-[#82c91e] rounded-lg transition-all duration-200"
                    title="Change Password"
                  >
                    <KeyRound className="w-5 h-5 lg:w-4 lg:h-4" />
                    <span className="hidden lg:inline text-sm font-medium">Password</span>
                  </button>

                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-2.5 py-2 lg:px-3 lg:py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 text-red-500 hover:text-red-400 rounded-lg transition-all duration-200"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5 lg:w-4 lg:h-4" />
                    <span className="hidden lg:inline text-sm font-medium">Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-qimtek-bg-secondary rounded-lg border border-qimtek-border text-qimtek-text-secondary hover:text-[#82c91e] hover:border-[#82c91e]/30 transition-all duration-200"
              >
                <LogIn className="w-4 h-4" />
                <span className="text-sm font-medium">Login</span>
              </Link>
            )}
          </div>
          <h1 className="sr-only">QimteK Hooks - Webhook Inspection Tool</h1>
        </div>
      </div>

      <div className={cn(
        "container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl flex-1",
        isSearchFocused && isMobile && "pb-2"
      )}>
        <p className="text-qimtek-text-secondary text-sm sm:text-base mb-6 text-center lg:text-left">
          Generate temporary webhook URLs to capture and inspect HTTP requests
        </p>

        {/* Connection Status */}
        <div className="mb-4 sm:mb-6 slide-enter" style={{ animationDelay: '0.1s' }}>
          <div className={cn(
            'inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm border transition-all duration-300',
            selectedWebhook
              ? isConnected
                ? 'bg-green-900/30 text-green-300 border-green-700/50'
                : 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50'
              : 'bg-gray-900/30 text-gray-400 border-gray-700/50'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0',
              selectedWebhook
                ? (isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400')
                : 'bg-gray-500'
            )} />
            <span className="hidden sm:inline">
              {selectedWebhook
                ? (isConnected
                  ? 'Connected'
                  : 'Active')
                : isAuthenticated
                  ? 'No webhooks - Click "Generate Webhook URL" to start'
                  : 'Please login to generate webhooks'}
            </span>
            <span className="sm:hidden">
              {selectedWebhook
                ? (isConnected
                  ? 'Connected'
                  : 'Active')
                : 'No webhook'}
            </span>
          </div>
        </div>

        {/* Webhook Generator */}
        {!isAuthenticated ? (
          <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-5 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 border border-qimtek-border card-enter">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-qimtek-text mb-3 sm:mb-4">
                Login Required
              </h2>
              <p className="text-sm sm:text-base text-qimtek-text-secondary mb-6">
                Please login to generate and manage webhook URLs
              </p>
              <Link
                to="/login"
                className={cn(
                  'inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-3.5 bg-[#82c91e] text-black rounded-xl font-semibold',
                  'hover:bg-[#6ba017] transition-all duration-200 hover:scale-105 active:scale-95',
                  'shadow-lg hover:shadow-xl hover:shadow-[#82c91e]/30',
                  'text-sm sm:text-base touch-manipulation'
                )}
              >
                <LogIn className="w-5 h-5" />
                Go to Login
              </Link>
            </div>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-5 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 border border-qimtek-border card-enter">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-qimtek-text mb-3 sm:mb-4">
                Generate Webhook URL
              </h2>
              <p className="text-sm sm:text-base text-qimtek-text-secondary mb-6">
                Create a temporary webhook endpoint to receive and inspect HTTP requests
              </p>

              <div className="max-w-md mx-auto mb-4">
                <input
                  type="text"
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  placeholder="Webhook Name"
                  className="w-full px-4 py-3 bg-qimtek-bg-secondary border border-qimtek-border rounded-xl text-qimtek-text focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50 text-center placeholder:text-qimtek-text-tertiary"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !webhookName.trim()}
                className={cn(
                  'px-6 sm:px-8 py-3.5 sm:py-3.5 bg-[#82c91e] text-black rounded-xl font-semibold',
                  'hover:bg-[#6ba017] disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all duration-200 hover:scale-105 active:scale-95',
                  'shadow-lg hover:shadow-xl hover:shadow-[#82c91e]/30',
                  'text-sm sm:text-base touch-manipulation min-h-[48px] min-w-[200px]'
                )}
              >
                {loading ? 'Generating...' : 'Generate Webhook URL'}
              </button>
              {error && (
                <p className="mt-4 text-red-400 animate-pulse text-sm">{error}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-4 sm:mb-6 lg:mb-8">
            {/* Webhook Selector */}
            {webhooks.length > 1 && (
              <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-4 border border-qimtek-border">
                <WebhookSelector
                  webhooks={webhooks}
                  selectedWebhook={selectedWebhook}
                  onSelect={setSelectedWebhook}
                />
              </div>
            )}

            {/* Selected Webhook Display */}
            {selectedWebhook && (
              <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-4 sm:p-6 border border-qimtek-border card-enter">
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 mb-4">
                  <div className="flex-1 w-full sm:w-auto min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-qimtek-text mb-2">
                      {selectedWebhook.name ? (
                        <span className="flex items-center gap-2">
                          {selectedWebhook.name}
                          <span className="text-sm font-normal text-qimtek-text-secondary">
                            ({webhooks.length > 1 ? 'Selected' : 'Your'} Webhook)
                          </span>
                        </span>
                      ) : (
                        webhooks.length > 1 ? 'Selected Webhook URL' : 'Your Webhook URL'
                      )}
                    </h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <code className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2.5 bg-qimtek-bg-secondary rounded-lg text-xs sm:text-sm break-all text-qimtek-text border border-qimtek-border transition-all font-mono overflow-x-auto min-w-0">
                        {selectedWebhook.url}
                      </code>
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <button
                          onClick={handleCopy}
                          className={cn(
                            'p-2.5 sm:p-3 rounded-lg hover:bg-qimtek-bg-secondary transition-all duration-200 border border-qimtek-border hover:scale-110 active:scale-95',
                            'flex-shrink-0 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center',
                            copied && 'bg-green-900/30 border-green-700'
                          )}
                          title="Copy URL"
                          aria-label="Copy webhook URL"
                        >
                          {copied ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <Copy className="w-5 h-5 text-qimtek-text-secondary" />
                          )}
                        </button>
                        <a
                          href={selectedWebhook.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 sm:p-3 rounded-lg hover:bg-qimtek-bg-secondary transition-all duration-200 border border-qimtek-border hover:scale-110 active:scale-95 flex-shrink-0 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Open in new tab"
                          aria-label="Open webhook URL in new tab"
                        >
                          <ExternalLink className="w-5 h-5 text-qimtek-text-secondary" />
                        </a>
                        <button
                          onClick={handleDeleteClick}
                          className="p-2.5 sm:p-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200 border border-transparent hover:border-red-800 hover:scale-110 active:scale-95 flex-shrink-0 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Delete webhook"
                          aria-label="Delete webhook"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs sm:text-sm text-qimtek-text-tertiary">
                        Expires: {selectedWebhook.expiresAt ? format(new Date(selectedWebhook.expiresAt), 'PPp') : 'N/A'}
                      </p>
                      <button
                        onClick={() => setShowGenerateModal(true)}
                        disabled={loading}
                        className="text-xs sm:text-sm text-[#82c91e] hover:text-[#6ba017] font-medium transition-colors"
                      >
                        + Generate Another
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Requests Dashboard */}
            {selectedWebhook && (
              <div className="bg-qimtek-bg-surface rounded-xl shadow-lg border border-qimtek-border card-enter" style={{ animationDelay: '0.2s' }}>
                <div className={cn("p-4 sm:p-6 border-b border-qimtek-border", isSearchFocused && isMobile && "pb-3")}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-qimtek-text flex items-center gap-2">
                      Requests
                      {requests.length > 0 && (
                        <span className="px-2.5 py-1 bg-[#82c91e]/20 text-[#82c91e] rounded-lg text-xs sm:text-sm font-semibold border border-[#82c91e]/30">
                          {requests.length}
                        </span>
                      )}
                    </h2>
                    {filteredRequests.length > 0 && !isSearchFocused && (
                      <button
                        onClick={exportRequests}
                        className="flex items-center gap-2 px-4 py-2 bg-qimtek-bg-secondary rounded-lg hover:bg-qimtek-tertiary-bg transition-all duration-200 border border-qimtek-border text-qimtek-text hover:scale-105 active:scale-95 text-sm sm:text-base touch-manipulation min-h-[44px]"
                        aria-label="Export requests"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                      </button>
                    )}
                  </div>

                  {/* Filters - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Filter className="w-4 h-4 text-qimtek-text-secondary flex-shrink-0" />
                      <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 border border-qimtek-border rounded-lg bg-qimtek-bg-secondary text-qimtek-text transition-all focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50 text-base sm:text-sm appearance-none cursor-pointer touch-manipulation min-h-[44px]"
                        style={{ fontSize: '16px' }} // Prevent zoom on iOS
                      >
                        {METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 flex items-center gap-2 relative">
                      <Search className="w-4 h-4 text-qimtek-text-secondary flex-shrink-0 absolute left-3 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        inputMode="search"
                        placeholder="Search in body/headers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className="flex-1 pl-9 pr-9 sm:pr-3 py-2.5 sm:py-2 border border-qimtek-border rounded-lg bg-qimtek-bg-secondary text-qimtek-text placeholder:text-qimtek-text-tertiary transition-all focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50 text-base sm:text-sm touch-manipulation min-h-[44px]"
                        style={{ fontSize: '16px' }} // Prevent zoom on iOS
                        aria-label="Search requests"
                      />
                      {searchQuery && (
                        <button
                          onClick={clearSearch}
                          className="absolute right-2 p-1.5 rounded-lg hover:bg-qimtek-bg transition-colors touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4 text-qimtek-text-secondary" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Requests - Mobile Cards / Desktop Table */}
                {filteredRequests.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center text-qimtek-text-secondary">
                    <p className="text-sm sm:text-base">
                      {requests.length === 0
                        ? 'No requests received yet. Send a request to your webhook URL to see it here.'
                        : 'No requests match your filters.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="p-4 sm:p-6 space-y-3 sm:hidden">
                      {filteredRequests.map((request) => (
                        <RequestCard key={request.id} request={request} onNavigate={handleNavigate} />
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-qimtek-bg">
                          <tr>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-qimtek-text-secondary uppercase tracking-wider">
                              Method
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-qimtek-text-secondary uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-qimtek-text-secondary uppercase tracking-wider">
                              IP Address
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-qimtek-text-secondary uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-qimtek-bg-surface divide-y divide-qimtek-border">
                          {filteredRequests.map((request) => (
                            <RequestRow key={request.id} request={request} onNavigate={handleNavigate} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />

      <GenerateWebhookModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        loading={loading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Webhook"
        message="Are you sure you want to delete this webhook? All associated requests will be permanently lost and cannot be recovered."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        onConfirm={handleChangePassword}
      />

      <MfaSetupModal
        isOpen={mfaModalOpen}
        onClose={() => setMfaModalOpen(false)}
      />
    </div >
  );
}