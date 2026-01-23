import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn, METHOD_COLORS } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';

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
    return format(date, 'PPp');
  } catch (e) {
    return 'Invalid Date';
  }
};

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();
  const [request, setRequest] = useState<WebhookRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

        const data = await response.json();
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
    navigate('/');
  }, [navigate]);

  // Memoized formatted timestamp
  const formattedTimestamp = useMemo(() => {
    return request ? safeFormatDate(request.timestamp) : '';
  }, [request]);

  // Memoized body content
  const bodyContent = useMemo(() => {
    if (!request?.body) return null;
    return typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body, null, 2);
  }, [request?.body]);

  // Memoized headers JSON
  const headersJson = useMemo(() => {
    return request ? JSON.stringify(request.headers, null, 2) : '';
  }, [request?.headers]);

  // Memoized query JSON
  const queryJson = useMemo(() => {
    return request?.query ? JSON.stringify(request.query, null, 2) : '';
  }, [request?.query]);

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
            aria-label="Back to home"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-qimtek-bg page-enter">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6 slide-enter">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Logo size="xl" />
            </div>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-qimtek-text-secondary hover:text-qimtek-text transition-all duration-200 hover:translate-x-[-4px] text-sm sm:text-base px-3 py-2 rounded-lg hover:bg-qimtek-bg-secondary touch-manipulation min-h-[44px]"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-qimtek-text">
            Request Details
          </h2>
        </div>

        {/* Request Info Card */}
        <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-qimtek-border card-enter" style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 sm:mb-6">
            <div>
              <label className="text-xs sm:text-sm font-medium text-qimtek-text-secondary block mb-1">Method</label>
              <span
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors inline-block',
                  METHOD_COLORS[request.method?.toUpperCase()] || 'bg-qimtek-bg text-qimtek-text border border-qimtek-border'
                )}
              >
                {request.method?.toUpperCase()}
              </span>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-qimtek-text-secondary block mb-1">Timestamp</label>
              <p className="text-sm sm:text-base text-qimtek-text break-words">
                {formattedTimestamp}
              </p>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-qimtek-text-secondary block mb-1">IP Address</label>
              <p className="text-sm sm:text-base text-qimtek-text font-mono break-all">{request.ip_address || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-qimtek-text-secondary block mb-1">Request ID</label>
              <p className="text-xs sm:text-sm font-mono text-qimtek-text break-all">{request.id}</p>
            </div>
          </div>

          <div className="mb-0 sm:mb-6">
            <label className="text-xs sm:text-sm font-medium text-qimtek-text-secondary block mb-1">URL</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <code className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2.5 bg-qimtek-bg-secondary rounded-lg text-xs sm:text-sm break-all text-qimtek-text border border-qimtek-border transition-all font-mono overflow-x-auto min-w-0">
                {request.url}
              </code>
              <button
                onClick={() => handleCopy(request.url, 'url')}
                className={cn(
                  'p-2.5 sm:p-3 rounded-lg hover:bg-qimtek-bg-secondary transition-all duration-200 border border-qimtek-border hover:scale-110 active:scale-95 flex-shrink-0',
                  'flex items-center justify-center touch-manipulation min-h-[44px] min-w-[44px]',
                  copied === 'url' && 'bg-green-900/30 border-green-700'
                )}
                aria-label="Copy URL"
              >
                {copied === 'url' ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-qimtek-text-secondary" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Headers */}
        <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-qimtek-border card-enter" style={{ animationDelay: '0.2s' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-qimtek-text">Headers</h2>
            <button
              onClick={() => copyJson(request.headers, 'headers')}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm border border-qimtek-border',
                'hover:bg-qimtek-bg-secondary transition-all duration-200 text-qimtek-text hover:scale-105 active:scale-95 w-full sm:w-auto justify-center touch-manipulation min-h-[44px]',
                copied === 'headers' && 'bg-green-900/30 border-green-700'
              )}
              aria-label="Copy headers JSON"
            >
              {copied === 'headers' ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy JSON
                </>
              )}
            </button>
          </div>
          <pre className="bg-qimtek-bg-secondary rounded-lg p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm text-qimtek-text border border-qimtek-border transition-all font-mono whitespace-pre-wrap break-words">
            {headersJson}
          </pre>
        </div>

        {/* Query Parameters */}
        {request.query && Object.keys(request.query).length > 0 && (
          <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-qimtek-border card-enter" style={{ animationDelay: '0.3s' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-qimtek-text">Query Parameters</h2>
              <button
                onClick={() => copyJson(request.query, 'query')}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm border border-qimtek-border',
                  'hover:bg-qimtek-bg-secondary transition-all duration-200 text-qimtek-text hover:scale-105 active:scale-95 w-full sm:w-auto justify-center touch-manipulation min-h-[44px]',
                  copied === 'query' && 'bg-green-900/30 border-green-700'
                )}
                aria-label="Copy query parameters JSON"
              >
                {copied === 'query' ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
            <pre className="bg-qimtek-bg-secondary rounded-lg p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm text-qimtek-text border border-qimtek-border transition-all font-mono whitespace-pre-wrap break-words">
              {queryJson}
            </pre>
          </div>
        )}

        {/* Body */}
        {request.body && (
          <div className="bg-qimtek-bg-surface rounded-xl shadow-lg p-4 sm:p-6 border border-qimtek-border card-enter" style={{ animationDelay: '0.4s' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-qimtek-text">Body</h2>
              <button
                onClick={() => copyJson(request.body, 'body')}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm border border-qimtek-border',
                  'hover:bg-qimtek-bg-secondary transition-all duration-200 text-qimtek-text hover:scale-105 active:scale-95 w-full sm:w-auto justify-center touch-manipulation min-h-[44px]',
                  copied === 'body' && 'bg-green-900/30 border-green-700'
                )}
                aria-label="Copy body JSON"
              >
                {copied === 'body' ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
            <pre className="bg-qimtek-bg-secondary rounded-lg p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm text-qimtek-text border border-qimtek-border transition-all font-mono whitespace-pre-wrap break-words">
              {bodyContent}
            </pre>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}