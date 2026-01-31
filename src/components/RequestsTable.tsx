import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Search, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn, METHOD_COLORS } from '@/lib/utils';
import { Webhook } from '@/hooks/useWebhook';

interface Request {
    id: string;
    method: string;
    url: string;
    timestamp: string;
    size?: number;
    body?: any;
    ip_address?: string;
    headers?: any;
    query?: any;
}

interface RequestsTableProps {
    requests: Request[];
    hasAdvancedFeatures: boolean;
    webhookToken?: string;
}

export default function RequestsTable({ requests, hasAdvancedFeatures, webhookToken }: RequestsTableProps) {
    const navigate = useNavigate();
    const [filterMethod, setFilterMethod] = useState('');
    const [filterSearch, setFilterSearch] = useState('');

    const filteredRequests = useMemo(() => {
        if (!requests) return [];
        let res = requests;

        if (filterMethod) {
            res = res.filter(r => r.method === filterMethod);
        }
        if (filterSearch) {
            const lower = filterSearch.toLowerCase();
            res = res.filter(r =>
                r.url.toLowerCase().includes(lower) ||
                (typeof r.body === 'string' && r.body.toLowerCase().includes(lower)) ||
                (typeof r.body === 'object' && JSON.stringify(r.body).toLowerCase().includes(lower))
            );
        }
        return res;
    }, [requests, filterMethod, filterSearch]);

    return (
        <div className="bg-qimtek-bg-surface rounded-xl border border-qimtek-border overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-qimtek-border flex flex-col md:flex-row gap-4 md:items-center">
                <div className="flex items-center gap-2 flex-1">
                    <Filter className="w-4 h-4 text-qimtek-text-secondary" />
                    <select
                        value={filterMethod}
                        onChange={(e) => setFilterMethod(e.target.value)}
                        disabled={!hasAdvancedFeatures}
                        className={cn(
                            "bg-qimtek-bg-secondary border border-qimtek-border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#82c91e] transition-colors",
                            !hasAdvancedFeatures && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <option value="">All Methods</option>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select>

                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-qimtek-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            placeholder="Search URL or Body..."
                            disabled={!hasAdvancedFeatures}
                            className={cn(
                                "w-full bg-qimtek-bg-secondary border border-qimtek-border rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#82c91e] transition-colors",
                                !hasAdvancedFeatures && "opacity-50 cursor-not-allowed"
                            )}
                        />
                    </div>
                </div>

                {!hasAdvancedFeatures && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20 text-xs font-medium">
                        <Lock className="w-3 h-3" />
                        Advanced filtering available in Professional Plan
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-qimtek-bg-secondary border-b border-qimtek-border">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-qimtek-text-secondary uppercase">Method</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-qimtek-text-secondary uppercase">Path</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-qimtek-text-secondary uppercase">Time</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-qimtek-text-secondary uppercase">Size</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-qimtek-text-secondary uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-qimtek-border">
                        {filteredRequests.map(req => (
                            <tr
                                key={req.id}
                                onClick={() => navigate(`/webhook/${webhookToken}/request/${req.id}`)}
                                className="hover:bg-qimtek-bg-secondary/50 transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded text-xs font-bold text-white",
                                        METHOD_COLORS[req.method.toUpperCase()] || 'bg-gray-600'
                                    )}>
                                        {req.method}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono truncate max-w-[200px]">
                                    {req.url}
                                </td>
                                <td className="px-6 py-4 text-sm text-qimtek-text-secondary">
                                    {format(new Date(req.timestamp), 'MMM d, HH:mm:ss')}
                                </td>
                                <td className="px-6 py-4 text-sm text-qimtek-text-secondary">
                                    {req.size !== undefined ? req.size : (req.body ? JSON.stringify(req.body).length : 0)} B
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-[#82c91e] opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                                        Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-qimtek-text-secondary">
                                    No requests captured yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
