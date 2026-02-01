import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, ExternalLink, Edit, Play, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn, METHOD_COLORS } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { PLAN_CONFIG, PlanRole } from '@/config/plans';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface WebhookRequest {
  id: string;
  webhook_token: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  query: any;
  timestamp: string;
  ip_address: string | null;
}

// Helper to safely format dates
const safeFormatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, 'PPp'); // e.g., Nov 25, 2023, 5:31:38 PM
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper to calculate relative time (e.g., "3 minutes ago")
const getRelativeTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (!isValid(date)) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  } catch (e) {
    return '';
  }
};

export default function RequestDetails() {
  const { token: webhookToken, id } = useParams<{ token: string; id: string }>();
  const navigate = useNavigate();
  const { token, loading: authLoading, user } = useAuth();
  const [request, setRequest] = useState<WebhookRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);

  // View options
  const [formatJson, setFormatJson] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);

  const canReplay = useMemo(() => {
    if (!user) return false;
    const role = (user.role || 'user') as PlanRole;
    return PLAN_CONFIG[role]?.features.requestReplay ?? false;
  }, [user]);

  const handleReplay = async () => {
    if (!request || replaying) return;
    setReplaying(true);
    try {
      const res = await fetch(`${API_URL}/webhooks/requests/${id}/replay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json() as any;
      if (data.success) {
        alert('Request replayed successfully');
      } else {
        alert(data.error || 'Failed to replay request');
      }
    } catch (e) {
      console.error(e);
      alert('Error replaying request');
    } finally {
      setReplaying(false);
    }
  };

  useEffect(() => {
    if (!id || authLoading) return;

    const fetchRequest = async () => {
      try {
        const response = await fetch(`${API_URL}/webhooks/requests/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed');
          }
          throw new Error('Failed to fetch request');
        }

        const data = await response.json() as any;
        if (data.success) {
          setRequest(data.request);
        } else {
          setError('Request not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch request');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id, token, authLoading]);

  const handleCopy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const copyJson = useCallback((obj: any, key: string) => {
    handleCopy(JSON.stringify(obj, null, 2), key);
  }, [handleCopy]);

  const handleBack = useCallback(() => {
    if (webhookToken) {
      navigate(`/webhook/${webhookToken}`);
    } else {
      navigate('/');
    }
  }, [navigate, webhookToken]);

  // Derived values
  const formattedTimestamp = useMemo(() => {
    return request ? safeFormatDate(request.timestamp) : '';
  }, [request]);

  const relativeTime = useMemo(() => {
    return request ? getRelativeTime(request.timestamp) : '';
  }, [request]);

  const requestSize = useMemo(() => {
    if (!request) return 0;
    const headersSize = JSON.stringify(request.headers).length;
    const bodySize = request.body ? (typeof request.body === 'string' ? request.body.length : JSON.stringify(request.body).length) : 0;
    return headersSize + bodySize;
  }, [request]);

  const bodyContent = useMemo(() => {
    if (!request?.body) return null;

    // Check for corrupted data
    if (request.body === '[object Object]') {
      return '⚠️ Error: Request body was not captured correctly (saved as [object Object]).\n\nThis usually happens when:\n1. The Content-Type header matches a parser that failed to handle the specific format.\n2. The request was pre-parsed by a proxy or tool before reaching the raw capture middleware.\n\nNew requests should be captured correctly with the latest update.';
    }

    if (!formatJson) {
      return typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    }
    return typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body, null, 2);
  }, [request?.body, formatJson]);

  const ipAddress = request?.ip_address || 'N/A';

  if (loading) {
    return (
      <div className="min-h-screen bg-qimtek-bg flex items-center justify-center page-enter px-4">
        <div className="text-qimtek-text-secondary flex flex-col sm:flex-row items-center gap-3">
          <div className="spinner w-5 h-5 border-2 border-[#82c91e] border-t-transparent rounded-full"></div>
          <span className="text-sm sm:text-base">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-qimtek-bg flex items-center justify-center page-enter px-4">
        <div className="text-center card-enter max-w-md w-full">
          <p className="text-red-400 mb-4 text-sm sm:text-base">{error || 'Request not found'}</p>
          <button
            onClick={handleBack}
            className="px-4 sm:px-6 py-3 sm:py-3.5 bg-[#82c91e] text-black rounded-lg sm:rounded-xl hover:bg-[#6ba017] transition-all duration-200 font-semibold hover:scale-105 active:scale-95 text-sm sm:text-base touch-manipulation min-h-[48px] min-w-[150px]"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-qimtek-bg page-enter font-mono text-sm">
      <SEO
        title={request ? `${request.method} ${request.url}` : 'Request Details'}
        description={request ? `Inspect ${request.method} request to ${request.url}` : 'View webhook request details'}
      />
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 max-w-7xl">
        {/* Header Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-qimtek-text-secondary hover:text-qimtek-text transition-colors px-3 py-2 rounded-lg hover:bg-qimtek-bg-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <button
                onClick={handleReplay}
                disabled={!canReplay || replaying}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border text-xs font-medium",
                  canReplay
                    ? "bg-qimtek-bg-secondary border-qimtek-border hover:bg-qimtek-bg-secondary/80 text-white"
                    : "bg-qimtek-bg-secondary/50 border-qimtek-border/50 text-qimtek-text-secondary cursor-not-allowed opacity-70"
                )}
              >
                {replaying ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Replay
              </button>
              {!canReplay && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-black/90 text-white text-xs rounded p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                  <div className="flex items-center gap-1 mb-1 text-yellow-500 font-bold">
                    <Lock className="w-3 h-3" />
                    Pro Feature
                  </div>
                  Replay functionality is available in Professional plan.
                </div>
              )}
            </div>
            <Logo size="sm" />
          </div>
        </div>

        {/* Main Details Section */}
        <div className="bg-qimtek-bg-surface rounded-none sm:rounded-md border border-qimtek-border overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-qimtek-border bg-qimtek-bg-secondary/30">
            <h3 className="font-bold text-qimtek-text flex items-center gap-2">
              <span className="transform rotate-90">▼</span> Request Details & Headers
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-qimtek-border">
            {/* Left Column: Request Info */}
            <div className="lg:col-span-5 p-4 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-bold text-white',
                    METHOD_COLORS[request.method?.toUpperCase()] || 'bg-gray-600'
                  )}
                >
                  {request.method?.toUpperCase()}
                </span>
                <a href={request.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all truncate">
                  {request.url}
                </a>
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-y-2 text-qimtek-text-secondary text-sm">
                <div className="font-semibold text-qimtek-text">Host</div>
                <div>
                  <span className="text-qimtek-text mr-2">{ipAddress}</span>
                  <div className="inline-flex gap-2 text-xs">
                    <a href={`https://whois.domaintools.com/${ipAddress}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Whois</a>
                    <a href={`https://www.shodan.io/host/${ipAddress}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Shodan</a>
                  </div>
                </div>

                <div className="font-semibold text-qimtek-text">Date</div>
                <div>
                  <span className="text-blue-400">{formattedTimestamp}</span>
                  <span className="text-qimtek-text-secondary ml-2">({relativeTime})</span>
                </div>

                <div className="font-semibold text-qimtek-text">Size</div>
                <div>{requestSize} bytes</div>

                <div className="font-semibold text-qimtek-text">Time</div>
                <div>0.001 sec</div>

                <div className="font-semibold text-qimtek-text">ID</div>
                <div className="font-mono text-xs text-qimtek-text-secondary">{request.id}</div>

                <div className="font-semibold text-qimtek-text pt-2">Note</div>
                <div className="pt-2">
                  <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs">
                    <Edit className="w-3 h-3" /> Add Note
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Headers */}
            <div className="lg:col-span-7 p-4 bg-qimtek-bg-surface">
              <div className="grid grid-cols-[140px_1fr] gap-y-1 text-xs font-mono">
                {Object.entries(request.headers).map(([key, value]) => (
                  <div key={key} className="contents group">
                    <div className="text-qimtek-text-secondary font-semibold py-1 border-b border-qimtek-border/30 truncate pr-2 group-hover:bg-qimtek-bg-secondary/50">
                      {key}
                    </div>
                    <div className="text-qimtek-text py-1 border-b border-qimtek-border/30 break-all group-hover:bg-qimtek-bg-secondary/50">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Query Strings */}
        {request.query && Object.keys(request.query).length > 0 && (
          <div className="mb-6">
            <div className="px-2 py-1 mb-2">
              <h3 className="font-bold text-qimtek-text flex items-center gap-2">
                <span className="transform rotate-90">▼</span> Query strings
              </h3>
            </div>
            <div className="bg-qimtek-bg-surface rounded-md border border-qimtek-border p-4">
              <div className="grid grid-cols-[140px_1fr] gap-y-1 text-xs font-mono">
                {Object.entries(request.query).map(([key, value]) => (
                  <div key={key} className="contents group">
                    <div className="text-qimtek-text-secondary font-semibold py-1 border-b border-qimtek-border/30 truncate pr-2 group-hover:bg-qimtek-bg-secondary/50">
                      {key}
                    </div>
                    <div className="text-qimtek-text py-1 border-b border-qimtek-border/30 break-all group-hover:bg-qimtek-bg-secondary/50">
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Form Values */}
        {request.body && typeof request.body === 'object' && !Array.isArray(request.body) && Object.keys(request.body).length > 0 && (
          <div className="mb-6">
            <div className="px-2 py-1 mb-2">
              <h3 className="font-bold text-qimtek-text flex items-center gap-2">
                <span className="transform rotate-90">▼</span> Form values
              </h3>
            </div>
            <div className="bg-qimtek-bg-surface rounded-md border border-qimtek-border p-4">
              <div className="grid grid-cols-[140px_1fr] gap-y-1 text-xs font-mono">
                {Object.entries(request.body).map(([key, value]) => (
                  <div key={key} className="contents group">
                    <div className="text-qimtek-text-secondary font-semibold py-1 border-b border-qimtek-border truncate pr-2 group-hover:bg-qimtek-bg-secondary/50">
                      {key}
                    </div>
                    <div className="text-qimtek-text py-1 border-b border-qimtek-border break-all group-hover:bg-qimtek-bg-secondary/50">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Request Content */}
        <div className="mb-6">
          <div className="px-2 py-1 mb-2">
            <h3 className="font-bold text-qimtek-text flex items-center gap-2">
              <span className="transform rotate-90">▼</span> Request Content
            </h3>
          </div>

          <div className="bg-qimtek-bg-surface rounded-md border border-qimtek-border">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-qimtek-border bg-qimtek-bg-secondary/30">
              <div className="font-semibold text-qimtek-text text-sm">Raw Content</div>
              <div className="flex items-center gap-4 text-xs sm:text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formatJson}
                    onChange={(e) => setFormatJson(e.target.checked)}
                    className="rounded border-qimtek-border bg-qimtek-bg text-[#82c91e] focus:ring-[#82c91e]"
                  />
                  <span className="text-qimtek-text">Format JSON</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={wordWrap}
                    onChange={(e) => setWordWrap(e.target.checked)}
                    className="rounded border-qimtek-border bg-qimtek-bg text-[#82c91e] focus:ring-[#82c91e]"
                  />
                  <span className="text-qimtek-text">Word-Wrap</span>
                </label>
                <button
                  onClick={() => copyJson(request.body, 'body')}
                  className="text-blue-400 hover:underline ml-2"
                >
                  {copied === 'body' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4 relative">
              {request.body ? (
                <pre className={cn(
                  "font-mono text-xs sm:text-sm text-qimtek-text overflow-x-auto",
                  wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
                )}>
                  {bodyContent}
                </pre>
              ) : (
                <div className="text-qimtek-text-secondary italic">No content</div>
              )}
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
}
