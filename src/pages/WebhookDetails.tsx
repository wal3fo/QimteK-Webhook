import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWebhook, Webhook } from '@/hooks/useWebhook';
import { useAuth } from '@/hooks/useAuth';
import {
    ArrowLeft, Clock, Activity, BarChart2, Calendar, Settings,
    Trash2, Power, Copy, Check, Download, AlertCircle, Play
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { format, isValid, parseISO } from 'date-fns';
import { cn, METHOD_COLORS } from '@/lib/utils';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import ConfirmModal from '@/components/ConfirmModal';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function WebhookDetails() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const {
        webhooks, selectedWebhook, requests, loading, error, isConnected,
        fetchRequests, deleteWebhook, setSelectedWebhook, fetchWebhooks
    } = useWebhook();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'settings'>('overview');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Initialize
    useEffect(() => {
        if (webhooks.length === 0) {
            fetchWebhooks();
        }
    }, [fetchWebhooks, webhooks.length]);

    useEffect(() => {
        if (token && webhooks.length > 0) {
            const webhook = webhooks.find(w => w.token === token);
            if (webhook) {
                setSelectedWebhook(webhook);
            } else {
                // Handle not found
            }
        }
    }, [token, webhooks, setSelectedWebhook]);

    const handleCopy = async () => {
        if (selectedWebhook) {
            await navigator.clipboard.writeText(selectedWebhook.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleToggleActive = async () => {
        if (!selectedWebhook) return;
        setIsUpdating(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/webhooks/${selectedWebhook.token}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Should use useAuth token but for quick access
                },
                body: JSON.stringify({ is_active: !selectedWebhook.is_active })
            });

            if (response.ok) {
                // Refresh webhooks to get updated state
                fetchWebhooks();
            }
        } catch (err) {
            console.error('Failed to toggle status', err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (selectedWebhook) {
            await deleteWebhook(selectedWebhook.token);
            navigate('/');
        }
    };

    // Stats
    const stats = useMemo(() => {
        if (!requests) return { total: 0, success: 0, error: 0, avgTime: 0 };
        const total = requests.length;
        // Assuming success is 2xx status - but requests capture raw requests, not responses we sent.
        // So "success" might mean "successfully captured". All captured are success?
        // Or maybe we analyze the response code we sent? The system sends 200 OK.
        // Let's just count total for now.
        return {
            total,
            lastActive: requests.length > 0 ? requests[0].timestamp : null
        };
    }, [requests]);

    // Chart Data
    const requestsOverTime = useMemo(() => {
        if (!requests || requests.length === 0) return [];
        // Group by hour or minute
        // Simple implementation: Last 24h
        const data: Record<string, number> = {};
        requests.forEach(r => {
            const time = format(new Date(r.timestamp), 'HH:00');
            data[time] = (data[time] || 0) + 1;
        });
        return Object.entries(data).map(([time, count]) => ({ time, count }));
    }, [requests]);

    const methodDistribution = useMemo(() => {
        if (!requests) return [];
        const data: Record<string, number> = {};
        requests.forEach(r => {
            const method = r.method || 'UNKNOWN';
            data[method] = (data[method] || 0) + 1;
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [requests]);

    if (loading && !selectedWebhook) {
        return (
            <div className="min-h-screen bg-qimtek-bg flex items-center justify-center">
                <div className="spinner w-8 h-8 border-4 border-[#82c91e] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!selectedWebhook && !loading && webhooks.length > 0) {
        return (
            <div className="min-h-screen bg-qimtek-bg flex items-center justify-center text-white">
                Webhook not found
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-qimtek-bg text-qimtek-text font-sans">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-qimtek-bg-secondary rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                {selectedWebhook?.name || 'Webhook Details'}
                                {selectedWebhook?.is_active === false && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">Inactive</span>
                                )}
                                {selectedWebhook?.is_active !== false && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">Active</span>
                                )}
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-qimtek-text-secondary mt-1">
                                <span className="font-mono">{selectedWebhook?.token}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                                <span>Created {selectedWebhook?.created_at && format(new Date(selectedWebhook.created_at), 'MMM d, yyyy')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleToggleActive}
                            disabled={isUpdating}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                                selectedWebhook?.is_active !== false
                                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                            )}
                        >
                            <Power className="w-4 h-4" />
                            {selectedWebhook?.is_active !== false ? 'Disable' : 'Enable'}
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>

                {/* URL Card */}
                <div className="bg-qimtek-bg-surface rounded-xl border border-qimtek-border p-6 mb-8 shadow-lg">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex-1 w-full">
                            <label className="text-xs font-semibold text-qimtek-text-secondary uppercase tracking-wider mb-2 block">Webhook URL</label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-qimtek-bg-secondary px-4 py-3 rounded-lg font-mono text-sm border border-qimtek-border overflow-x-auto">
                                    {selectedWebhook?.url}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    className={cn(
                                        "px-4 rounded-lg border border-qimtek-border hover:bg-qimtek-bg-secondary transition-all flex items-center justify-center min-w-[3rem]",
                                        copied && "border-green-500 text-green-500"
                                    )}
                                >
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                </button>
                                <a
                                    href={selectedWebhook?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 rounded-lg border border-qimtek-border hover:bg-qimtek-bg-secondary transition-all flex items-center justify-center min-w-[3rem]"
                                >
                                    <ExternalLinkIcon />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-qimtek-border mb-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={cn(
                            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'overview'
                                ? "border-[#82c91e] text-[#82c91e]"
                                : "border-transparent text-qimtek-text-secondary hover:text-qimtek-text"
                        )}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={cn(
                            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'requests'
                                ? "border-[#82c91e] text-[#82c91e]"
                                : "border-transparent text-qimtek-text-secondary hover:text-qimtek-text"
                        )}
                    >
                        Requests <span className="ml-2 px-2 py-0.5 bg-qimtek-bg-secondary rounded-full text-xs">{requests.length}</span>
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Stats Cards */}
                        <div className="bg-qimtek-bg-surface p-6 rounded-xl border border-qimtek-border">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-qimtek-text-secondary">Total Requests</h3>
                            </div>
                            <p className="text-3xl font-bold">{stats.total}</p>
                        </div>

                        <div className="bg-qimtek-bg-surface p-6 rounded-xl border border-qimtek-border">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-qimtek-text-secondary">Last Active</h3>
                            </div>
                            <p className="text-xl font-bold">
                                {stats.lastActive ? format(new Date(stats.lastActive), 'PP p') : 'Never'}
                            </p>
                        </div>

                        <div className="bg-qimtek-bg-surface p-6 rounded-xl border border-qimtek-border md:col-span-2 lg:col-span-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                                    <BarChart2 className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-qimtek-text-secondary">Method Distribution</h3>
                            </div>
                            <div className="h-[150px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={methodDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {methodDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1b1e', borderColor: '#2c2e33' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Main Chart */}
                        <div className="bg-qimtek-bg-surface p-6 rounded-xl border border-qimtek-border md:col-span-3">
                            <h3 className="font-semibold text-lg mb-6">Traffic Volume</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={requestsOverTime}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#82c91e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#82c91e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2c2e33" />
                                        <XAxis dataKey="time" stroke="#909296" />
                                        <YAxis stroke="#909296" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1b1e', borderColor: '#2c2e33' }}
                                            itemStyle={{ color: '#82c91e' }}
                                        />
                                        <Area type="monotone" dataKey="count" stroke="#82c91e" fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                    <div className="bg-qimtek-bg-surface rounded-xl border border-qimtek-border overflow-hidden">
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
                                    {requests.map(req => (
                                        <tr
                                            key={req.id}
                                            onClick={() => navigate(`/webhook/${selectedWebhook?.token}/request/${req.id}`)}
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
                )}
            </div>

            <Footer />

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Webhook"
                message="Are you sure you want to delete this webhook? This action cannot be undone and all captured requests will be lost."
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
}

function ExternalLinkIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );
}
