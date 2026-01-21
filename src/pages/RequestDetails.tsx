import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Logo from '@/components/Logo';

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

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<WebhookRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      try {
        const response = await fetch(`${API_URL}/webhooks/requests/${id}`);
        if (!response.ok) {
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
  }, [id]);

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
    return request ? format(new Date(request.timestamp), 'PPpp') : '';
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
      <div className="min-h-screen bg-qimtek-bg flex items-center justify-center page-enter">
        <div className="text-qimtek-text-secondary flex items-center gap-3">
          <div className="spinner w-5 h-5 border-2 border-[#82c91e] border-t-transparent rounded-full"></div>
          Loading...
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-qimtek-bg flex items-center justify-center page-enter">
        <div className="text-center card-enter">
          <p className="text-red-400 mb-4">{error || 'Request not found'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-[#82c91e] text-black rounded hover:bg-[#6ba017] transition-all duration-200 font-semibold hover:scale-105 active:scale-95"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-qimtek-bg page-enter">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 slide-enter">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Logo size="lg" />
            </div>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-qimtek-text-secondary hover:text-qimtek-text transition-all duration-200 hover:translate-x-[-4px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
          <h2 className="text-3xl font-bold text-qimtek-text">
            Request Details
          </h2>
        </div>

        {/* Request Info Card */}
        <div className="bg-qimtek-bg-surface rounded-lg shadow-md p-6 mb-6 border border-qimtek-border card-enter" style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-qimtek-text-secondary">Method</label>
              <p className="mt-1 text-lg font-semibold text-qimtek-text">{request.method}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-qimtek-text-secondary">Timestamp</label>
              <p className="mt-1 text-qimtek-text">
                {formattedTimestamp}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-qimtek-text-secondary">IP Address</label>
              <p className="mt-1 text-qimtek-text">{request.ip_address || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-qimtek-text-secondary">Request ID</label>
              <p className="mt-1 font-mono text-sm text-qimtek-text">{request.id}</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-qimtek-text-secondary">URL</label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-qimtek-bg-secondary rounded text-sm break-all text-qimtek-text border border-qimtek-border transition-all">
                {request.url}
              </code>
              <button
                onClick={() => handleCopy(request.url, 'url')}
                className={cn(
                  'p-2 rounded hover:bg-qimtek-bg-secondary transition-all duration-200 border border-qimtek-border hover:scale-110 active:scale-95',
                  copied === 'url' && 'bg-green-900/30 border-green-700'
                )}
              >
                {copied === 'url' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-qimtek-text-secondary" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Headers */}
        <div className="bg-qimtek-bg-surface rounded-lg shadow-md p-6 mb-6 border border-qimtek-border card-enter" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-qimtek-text">Headers</h2>
            <button
              onClick={() => copyJson(request.headers, 'headers')}
              className={cn(
                'flex items-center gap-2 px-3 py-1 rounded text-sm border border-qimtek-border',
                'hover:bg-qimtek-bg-secondary transition-all duration-200 text-qimtek-text hover:scale-105 active:scale-95',
                copied === 'headers' && 'bg-green-900/30 border-green-700'
              )}
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
          <pre className="bg-qimtek-bg-secondary rounded p-4 overflow-x-auto text-sm text-qimtek-text border border-qimtek-border transition-all">
            {headersJson}
          </pre>
        </div>

        {/* Query Parameters */}
        {request.query && Object.keys(request.query).length > 0 && (
          <div className="bg-qimtek-bg-surface rounded-lg shadow-md p-6 mb-6 border border-qimtek-border card-enter" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-qimtek-text">Query Parameters</h2>
              <button
                onClick={() => copyJson(request.query, 'query')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1 rounded text-sm border border-qimtek-border',
                  'hover:bg-qimtek-bg-secondary transition-all duration-200 text-qimtek-text hover:scale-105 active:scale-95',
                  copied === 'query' && 'bg-green-900/30 border-green-700'
                )}
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
            <pre className="bg-qimtek-bg-secondary rounded p-4 overflow-x-auto text-sm text-qimtek-text border border-qimtek-border transition-all">
              {queryJson}
            </pre>
          </div>
        )}

        {/* Body */}
        {request.body && (
          <div className="bg-qimtek-bg-surface rounded-lg shadow-md p-6 border border-qimtek-border card-enter" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-qimtek-text">Body</h2>
              <button
                onClick={() => copyJson(request.body, 'body')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1 rounded text-sm border border-qimtek-border',
                  'hover:bg-qimtek-bg-secondary transition-all duration-200 text-qimtek-text hover:scale-105 active:scale-95',
                  copied === 'body' && 'bg-green-900/30 border-green-700'
                )}
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
            <pre className="bg-qimtek-bg-secondary rounded p-4 overflow-x-auto text-sm text-qimtek-text border border-qimtek-border transition-all">
              {bodyContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}