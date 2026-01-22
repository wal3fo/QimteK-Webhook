import { useState, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Trash2, ExternalLink, Filter, Search, Download } from 'lucide-react';
import { useWebhook } from '@/hooks/useWebhook';
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import Logo from '@/components/Logo';

const formatDate = (dateValue: string | number | Date | undefined | null): string => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  return isValid(date) ? format(date, 'PPpp') : 'Invalid date';
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-900/30 text-blue-300 border border-blue-700/50',
  POST: 'bg-green-900/30 text-green-300 border border-green-700/50',
  PUT: 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50',
  PATCH: 'bg-orange-900/30 text-orange-300 border border-orange-700/50',
  DELETE: 'bg-red-900/30 text-red-300 border border-red-700/50',
};

const METHODS = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Memoized request row component
const RequestRow = memo(({ request, onNavigate }: { request: any; onNavigate: (id: string) => void }) => (
  <tr
    className="hover:bg-qimtek-bg-secondary transition-all duration-200 cursor-pointer"
    onClick={() => onNavigate(request.id)}
  >
    <td className="px-6 py-4 whitespace-nowrap">
      <span
        className={cn(
          'px-2 py-1 rounded text-xs font-medium transition-colors',
          METHOD_COLORS[request.method] || 'bg-qimtek-bg-secondary text-qimtek-text border border-qimtek-border'
        )}
      >
        {request.method}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-qimtek-text">
      {formatDate(request.timestamp)}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-qimtek-text-secondary">
      {request.ip_address || 'N/A'}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(request.id);
        }}
        className="text-[#82c91e] hover:text-[#6ba017] transition-colors font-medium"
      >
        View Details
      </button>
    </td>
  </tr>
));

RequestRow.displayName = 'RequestRow';

export default function Home() {
  const navigate = useNavigate();
  const { webhook, requests, loading, error, isConnected, generateWebhook, deleteWebhook } = useWebhook();
  const [copied, setCopied] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Memoized handlers
  const handleGenerate = useCallback(async () => {
    await generateWebhook(60);
  }, [generateWebhook]);

  const handleCopy = useCallback(async () => {
    if (!webhook) return;
    try {
      await navigator.clipboard.writeText(webhook.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [webhook]);

  const handleDelete = useCallback(async () => {
    if (confirm('Are you sure you want to delete this webhook? All requests will be lost.')) {
      await deleteWebhook();
    }
  }, [deleteWebhook]);

  const handleNavigate = useCallback((id: string) => {
    navigate(`/request/${id}`);
  }, [navigate]);

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
    <div className="min-h-screen bg-qimtek-bg page-enter">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 slide-enter">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Logo size="lg" />
            <a
              href="https://www.paypal.com/paypalme/drgineer/5?currencyCode=USD"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-[#0070ba] via-[#009cde] to-[#0070ba] text-white rounded-xl font-semibold transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg hover:shadow-2xl hover:shadow-[#0070ba]/50 overflow-hidden"
              title="Support this project with a donation"
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* PayPal Icon */}
              <svg 
                className="w-6 h-6 relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.203zm14.146-14.42a.805.805 0 0 0-.796-.68h-3.22c-.524 0-.968.382-1.05.9l-1.12 7.203c-.082.519.109.74.633.74h1.78c.524 0 .968-.382 1.05-.9l1.12-7.203c.082-.519-.109-.74-.633-.74h-1.78z"/>
              </svg>
              
              {/* Text with glow effect */}
              <span className="relative z-10 text-sm tracking-wide group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-300">
                Donate $5
              </span>
              
              {/* Sparkle effect on hover */}
              <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
            </a>
          </div>
          <p className="text-qimtek-text-secondary">
            Generate temporary webhook URLs to capture and inspect HTTP requests
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-6 slide-enter" style={{ animationDelay: '0.1s' }}>
          <div className={cn(
            'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border transition-all duration-300',
            webhook
              ? isConnected
                ? 'bg-green-900/30 text-green-300 border-green-700/50'
                : 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50'
              : 'bg-gray-900/30 text-gray-400 border-gray-700/50'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              webhook 
                ? (isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400')
                : 'bg-gray-500'
            )} />
            {webhook 
              ? (isConnected 
                  ? 'Connected (Real-time active)' 
                  : 'Active (Polling for updates)')
              : 'No active webhook - Click "Generate Webhook URL" to start'}
          </div>
        </div>

        {/* Webhook Generator */}
        {!webhook ? (
          <div className="bg-qimtek-bg-surface rounded-lg shadow-md p-8 mb-8 border border-qimtek-border card-enter">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-qimtek-text mb-4">
                Generate Webhook URL
              </h2>
              <p className="text-qimtek-text-secondary mb-6">
                Create a temporary webhook endpoint to receive and inspect HTTP requests
              </p>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className={cn(
                  'px-6 py-3 bg-[#82c91e] text-black rounded-lg font-medium',
                  'hover:bg-[#6ba017] disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all duration-200 font-semibold hover:scale-105 active:scale-95'
                )}
              >
                {loading ? 'Generating...' : 'Generate Webhook URL'}
              </button>
              {error && (
                <p className="mt-4 text-red-400 animate-pulse">{error}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-qimtek-bg-surface rounded-lg shadow-md p-6 mb-8 border border-qimtek-border card-enter">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-qimtek-text mb-2">
                  Your Webhook URL
                </h2>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-2 bg-qimtek-bg-secondary rounded text-sm break-all text-qimtek-text border border-qimtek-border transition-all">
                    {webhook.url}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'p-2 rounded hover:bg-qimtek-bg-secondary transition-all duration-200 border border-qimtek-border hover:scale-110 active:scale-95',
                      copied && 'bg-green-900/30 border-green-700'
                    )}
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-qimtek-text-secondary" />
                    )}
                  </button>
                  <a
                    href={webhook.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded hover:bg-qimtek-bg-secondary transition-all duration-200 border border-qimtek-border hover:scale-110 active:scale-95"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-5 h-5 text-qimtek-text-secondary" />
                  </a>
                </div>
                <p className="mt-2 text-sm text-qimtek-text-tertiary">
                  Expires: {formatDate(webhook.expiresAt)}
                </p>
              </div>
              <button
                onClick={handleDelete}
                className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-all duration-200 border border-transparent hover:border-red-800 hover:scale-110 active:scale-95"
                title="Delete webhook"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Requests Dashboard */}
        {webhook && (
          <div className="bg-qimtek-bg-surface rounded-lg shadow-md border border-qimtek-border card-enter" style={{ animationDelay: '0.2s' }}>
            <div className="p-6 border-b border-qimtek-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-qimtek-text">
                  Requests
                  {requests.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-[#82c91e]/20 text-[#82c91e] rounded text-sm border border-[#82c91e]/30 transition-all">
                      {requests.length}
                    </span>
                  )}
                </h2>
                {filteredRequests.length > 0 && (
                  <button
                    onClick={exportRequests}
                    className="flex items-center gap-2 px-4 py-2 bg-qimtek-bg-secondary rounded hover:bg-qimtek-tertiary-bg transition-all duration-200 border border-qimtek-border text-qimtek-text hover:scale-105 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-qimtek-text-secondary" />
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="px-3 py-1 border border-qimtek-border rounded bg-qimtek-bg-secondary text-qimtek-text transition-all"
                  >
                    {METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 flex items-center gap-2 max-w-md">
                  <Search className="w-4 h-4 text-qimtek-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search in body/headers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-1 border border-qimtek-border rounded bg-qimtek-bg-secondary text-qimtek-text placeholder:text-qimtek-text-tertiary transition-all focus:outline-none focus:ring-2 focus:ring-[#82c91e]/50"
                  />
                </div>
              </div>
            </div>

            {/* Requests Table */}
            <div className="overflow-x-auto">
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center text-qimtek-text-secondary">
                  {requests.length === 0
                    ? 'No requests received yet. Send a request to your webhook URL to see it here.'
                    : 'No requests match your filters.'}
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-qimtek-bg">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-qimtek-text-secondary uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-qimtek-text-secondary uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-qimtek-text-secondary uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-qimtek-text-secondary uppercase tracking-wider">
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}