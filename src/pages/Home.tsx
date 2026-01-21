import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Trash2, ExternalLink, Filter, Search, Download } from 'lucide-react';
import { useWebhook } from '@/hooks/useWebhook';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Logo from '@/components/Logo';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-900/30 text-blue-300 border border-blue-700/50',
  POST: 'bg-green-900/30 text-green-300 border border-green-700/50',
  PUT: 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50',
  PATCH: 'bg-orange-900/30 text-orange-300 border border-orange-700/50',
  DELETE: 'bg-red-900/30 text-red-300 border border-red-700/50',
};

export default function Home() {
  const navigate = useNavigate();
  const { webhook, requests, loading, error, isConnected, generateWebhook, deleteWebhook } = useWebhook();
  const [copied, setCopied] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleGenerate = async () => {
    await generateWebhook(60);
  };

  const handleCopy = async () => {
    if (!webhook) return;
    try {
      await navigator.clipboard.writeText(webhook.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this webhook? All requests will be lost.')) {
      await deleteWebhook();
    }
  };

  const filteredRequests = requests.filter((req) => {
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

  const exportRequests = () => {
    const dataStr = JSON.stringify(filteredRequests, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `webhook-requests-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  return (
    <div className="min-h-screen bg-qimtek-bg">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-qimtek-text-secondary">
            Generate temporary webhook URLs to capture and inspect HTTP requests
          </p>
        </div>

        {/* Connection Status - Supabase Realtime */}
        <div className="mb-6">
          <div className={cn(
            'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border',
            isConnected
              ? 'bg-green-900/30 text-green-300 border-green-700/50'
              : 'bg-red-900/30 text-red-300 border-red-700/50'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-400' : 'bg-red-400'
            )} />
            {isConnected 
              ? 'Connected (Supabase Realtime)' 
              : webhook 
                ? 'Disconnected (Realtime subscription failed)' 
                : 'Not connected (No active webhook)'}
          </div>
        </div>

        {/* Webhook Generator */}
        {!webhook ? (
          <div className="bg-qimtek-bg-surface rounded-lg shadow-md p-8 mb-8 border border-qimtek-border">
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
                  'transition-colors font-semibold'
                )}
              >
                {loading ? 'Generating...' : 'Generate Webhook URL'}
              </button>
              {error && (
                <p className="mt-4 text-red-400">{error}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-qimtek-bg-surface rounded-lg shadow-md p-6 mb-8 border border-qimtek-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-qimtek-text mb-2">
                  Your Webhook URL
                </h2>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-2 bg-qimtek-bg-secondary rounded text-sm break-all text-qimtek-text border border-qimtek-border">
                    {webhook.url}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'p-2 rounded hover:bg-qimtek-bg-secondary transition-colors border border-qimtek-border',
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
                    className="p-2 rounded hover:bg-qimtek-bg-secondary transition-colors border border-qimtek-border"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-5 h-5 text-qimtek-text-secondary" />
                  </a>
                </div>
                <p className="mt-2 text-sm text-qimtek-text-tertiary">
                  Expires: {format(new Date(webhook.expiresAt), 'PPpp')}
                </p>
              </div>
              <button
                onClick={handleDelete}
                className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors border border-transparent hover:border-red-800"
                title="Delete webhook"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Requests Dashboard */}
        {webhook && (
          <div className="bg-qimtek-bg-surface rounded-lg shadow-md border border-qimtek-border">
            <div className="p-6 border-b border-qimtek-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-qimtek-text">
                  Requests
                  {requests.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-[#82c91e]/20 text-[#82c91e] rounded text-sm border border-[#82c91e]/30">
                      {requests.length}
                    </span>
                  )}
                </h2>
                {filteredRequests.length > 0 && (
                  <button
                    onClick={exportRequests}
                    className="flex items-center gap-2 px-4 py-2 bg-qimtek-bg-secondary rounded hover:bg-qimtek-tertiary-bg transition-colors border border-qimtek-border text-qimtek-text"
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
                    className="px-3 py-1 border border-qimtek-border rounded bg-qimtek-bg-secondary text-qimtek-text"
                  >
                    {methods.map((method) => (
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
                    className="flex-1 px-3 py-1 border border-qimtek-border rounded bg-qimtek-bg-secondary text-qimtek-text placeholder:text-qimtek-text-tertiary"
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
                      <tr
                        key={request.id}
                        className="hover:bg-qimtek-bg-secondary transition-colors cursor-pointer"
                        onClick={() => navigate(`/request/${request.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              METHOD_COLORS[request.method] || 'bg-qimtek-bg-secondary text-qimtek-text border border-qimtek-border'
                            )}
                          >
                            {request.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-qimtek-text">
                          {format(new Date(request.timestamp), 'PPpp')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-qimtek-text-secondary">
                          {request.ip_address || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/request/${request.id}`);
                            }}
                            className="text-[#82c91e] hover:text-[#6ba017] transition-colors font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
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
