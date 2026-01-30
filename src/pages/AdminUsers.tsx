
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Shield, User, RefreshCw, AlertTriangle, UserPlus, Briefcase, ShieldCheck, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import ConfirmModal from '@/components/ConfirmModal';
import CreateUserModal from '@/components/CreateUserModal';
import EditRoleModal from '@/components/EditRoleModal';
import { DataTable, Column } from '@/components/DataTable';

import { PLAN_CONFIG } from '@/config/plans';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface UserData {
  id: string;
  email: string;
  role: 'Administrator' | 'Professional' | 'user';
  created_at: string;
  mfa_enabled?: boolean;
  webhook_count?: number;
  plan_expires_at?: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicPlans, setDynamicPlans] = useState<any>(null);

  // Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [userToEditRole, setUserToEditRole] = useState<UserData | null>(null);

  useEffect(() => {
    // Auth check is now handled by ProtectedRoute
  }, []);

  // Fetch dynamic plans
  useEffect(() => {
    const fetchPlans = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/plans`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
          const result = await response.json();
          if (result.success && result.data) {
            setDynamicPlans(result.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dynamic plans:', err);
      }
    };
    fetchPlans();
  }, [token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      console.log(`Fetching users from: ${API_URL}/users`);
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Fetch users error: Non-JSON response', text);
        throw new Error('Received non-JSON response from server');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to fetch users (${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Fetch users exception:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const handleDeleteUser = async () => {
    if (!userToDelete || !token) return;

    try {
      const response = await fetch(`${API_URL}/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setUsers(users.filter(u => u.id !== userToDelete.id));
        setDeleteModalOpen(false);
        setUserToDelete(null);
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user');
    }
  };

  const handleCreateUser = async (userData: { email: string; password: string; role: 'user' | 'Administrator' | 'Professional' }) => {
    if (!token) return;

    try {
      console.log(`Creating user at: ${API_URL}/users`);
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create user error:', response.status, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Failed to create user (${response.status})`);
        } catch (e) {
          throw new Error(`Failed to create user (${response.status}): ${errorText.substring(0, 100)}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        // Refresh users list or add to list
        setUsers([...users, data.user]);
        setCreateModalOpen(false);
      } else {
        alert(data.error || 'Failed to create user');
        throw new Error(data.error || 'Failed to create user');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      // Re-throw to be handled by the modal
      throw err;
    }
  };

  const openRoleModal = (user: UserData) => {
    setUserToEditRole(user);
    setRoleModalOpen(true);
  };

  const handleRoleUpdate = async (newRole: 'user' | 'Administrator' | 'Professional') => {
    if (!userToEditRole || !token) return;

    try {
      const response = await fetch(`${API_URL}/users/${userToEditRole.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (data.success) {
        setUsers(users.map(u => u.id === userToEditRole.id ? { ...u, role: newRole } : u));
        // Modal closing is handled by the component on success, but we can update state here if needed
        // The modal calls this function and waits for it.
      } else {
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      throw err;
    }
  };

  const roleCounts = useMemo(() => {
    const counts = {
      Administrator: 0,
      Professional: 0,
      user: 0
    };
    users.forEach(user => {
      if (counts[user.role] !== undefined) {
        counts[user.role]++;
      }
    });
    return counts;
  }, [users]);

  const columns = useMemo<Column<UserData>[]>(() => [
    {
      key: 'email',
      header: 'User',
      sortable: true,
      filterable: true,
      align: 'center',
      render: (userData) => (
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full bg-qimtek-bg border border-qimtek-border flex items-center justify-center text-qimtek-text-secondary">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-qimtek-text">{userData.email}</div>
            <div className="text-xs text-qimtek-text-secondary font-mono">{userData.id.slice(0, 8)}...</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      filterable: true,
      align: 'center',
      render: (userData) => {
        return (
          <div className="flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (userData.id !== user?.id) openRoleModal(userData);
              }}
              disabled={userData.id === user?.id}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all w-fit",
                userData.role === 'Administrator'
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                  : userData.role === 'Professional'
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                    : "bg-[#82c91e]/10 text-[#82c91e] border-[#82c91e]/20 hover:bg-[#82c91e]/20",
                userData.id === user?.id && "opacity-50 cursor-not-allowed"
              )}
            >
              {userData.role === 'Administrator' ? <Shield className="w-3 h-3" /> :
                userData.role === 'Professional' ? <Briefcase className="w-3 h-3" /> :
                  <User className="w-3 h-3" />}
              {userData.role.toUpperCase()}
            </button>
          </div>
        );
      }
    },
    {
      key: 'plan_expires_at',
      header: 'Expires',
      sortable: true,
      align: 'center',
      render: (userData) => (
        userData.role === 'Professional' ? (
          <span className="text-xs text-qimtek-text-secondary font-mono">
            {userData.plan_expires_at ? format(new Date(userData.plan_expires_at), 'PP') : 'Never'}
          </span>
        ) : (
          <span className="text-xs text-qimtek-text-tertiary">-</span>
        )
      )
    },
    {
      key: 'usage',
      header: 'Usage',
      align: 'center',
      render: (userData) => {
        // Use dynamic plans if available, otherwise fallback to static config
        const plans = dynamicPlans || PLAN_CONFIG;
        // @ts-ignore
        const plan = plans[userData.role] || plans['user'];
        const maxWebhooks = plan?.maxWebhooks || 1;

        const webhookCount = userData.webhook_count || 0;

        return (
          <div className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border transition-all duration-300',
            webhookCount >= maxWebhooks
              ? 'bg-red-900/30 text-red-300 border-red-700/50'
              : 'bg-blue-900/30 text-blue-300 border-blue-700/50'
          )}>
            <span className="opacity-80">Used:</span>
            <span className="font-mono font-medium">{webhookCount} / {maxWebhooks >= 99999 ? 'Unlimited' : maxWebhooks}</span>
          </div>
        );
      }
    },
    {
      key: 'mfa_enabled',
      header: '2FA',
      sortable: true,
      align: 'center',
      render: (userData) => (
        userData.mfa_enabled ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[#82c91e]/10 text-[#82c91e] border border-[#82c91e]/20">
            <Shield className="w-3 h-3" />
            Enabled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
            <Shield className="w-3 h-3 opacity-50" />
            Disabled
          </span>
        )
      )
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      filterable: true,
      align: 'center',
      render: (userData) => (
        <span className="text-qimtek-text-secondary">
          {format(new Date(userData.created_at || Date.now()), 'PP')}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (userData) => (
        userData.id !== user?.id ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setUserToDelete(userData);
              setDeleteModalOpen(true);
            }}
            className="text-qimtek-text-secondary hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
            title="Delete User"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null
      )
    }
  ], [user, openRoleModal, dynamicPlans]);

  return (
    <div className="min-h-screen bg-qimtek-bg text-qimtek-text font-mono selection:bg-[#82c91e] selection:text-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-qimtek-bg/80 backdrop-blur-md border-b border-qimtek-border">
        <div className="w-full px-0 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 lg:px-6">
            <Link
              to="/"
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-qimtek-bg-secondary border border-qimtek-border hover:border-[#82c91e]/50 hover:text-[#82c91e] transition-all duration-200"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo className="h-6 sm:h-8" />
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 bg-purple-500/10 text-purple-400 border-purple-500/20">
              <Shield className="w-3 h-3" />
              <span className="hidden lg:inline">ADMINISTRATOR:</span>
              <span className="lg:hidden">ADMIN:</span>
              {roleCounts.Administrator}
            </div>
            <div className="px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border-blue-500/20">
              <Briefcase className="w-3 h-3" />
              <span className="hidden lg:inline">PROFESSIONAL:</span>
              <span className="lg:hidden">PRO:</span>
              {roleCounts.Professional}
            </div>
            <div className="px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 bg-[#82c91e]/10 text-[#82c91e] border-[#82c91e]/20">
              <User className="w-3 h-3" />
              USER: {roleCounts.user}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 lg:px-6">
            <Link
              to="/admin/plans"
              className="flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2 bg-qimtek-bg-secondary hover:bg-qimtek-bg-tertiary text-qimtek-text border border-qimtek-border rounded-lg transition-colors text-sm font-semibold"
              title="Configure Plans"
            >
              <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Plans</span>
            </Link>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2 bg-[#82c91e] hover:bg-[#6ba017] text-black rounded-lg transition-colors text-sm font-semibold shadow-lg shadow-[#82c91e]/10"
              title="New User"
            >
              <UserPlus className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">New User</span>
            </button>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2.5 sm:p-2 text-qimtek-text-secondary hover:text-qimtek-text hover:bg-qimtek-bg-secondary rounded-lg transition-colors border border-transparent hover:border-qimtek-border"
              title="Refresh Users"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-2 sm:px-4 lg:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-qimtek-text">👥 User Management</h1>
            <p className="text-qimtek-text-secondary">Manage registered users and their roles.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <DataTable
            columns={columns}
            data={users}
            isLoading={loading}
            emptyMessage="No users found."
            className="w-full"
            pagination={true}
            pageSize={10}
          />
        </div>
      </main>

      <Footer />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user ${userToDelete?.email}? This action cannot be undone.`}
        confirmText="Delete User"
        isDanger={true}
      />

      <CreateUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onConfirm={handleCreateUser}
      />

      <EditRoleModal
        isOpen={roleModalOpen}
        onClose={() => {
          setRoleModalOpen(false);
          setUserToEditRole(null);
        }}
        onConfirm={handleRoleUpdate}
        currentRole={userToEditRole?.role || 'user'}
        userEmail={userToEditRole?.email || ''}
      />
    </div>
  );
}
