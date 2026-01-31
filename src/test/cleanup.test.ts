import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanupOldRequests } from '../../api/utils/cleanup';

// Hoist mocks
const { mockSupabase, mockSelect, mockEq, mockDelete, mockIn, mockLt, mockOr } = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockLt = vi.fn();
  const mockIn = vi.fn();
  const mockOr = vi.fn();
  const mockSelect = vi.fn();
  const mockDelete = vi.fn();

  // Chain setups
  mockSelect.mockReturnValue({ eq: mockEq });
  mockDelete.mockReturnValue({ or: mockOr, in: mockIn });
  mockIn.mockReturnValue({ lt: mockLt });

  const mockSupabase = {
    from: vi.fn(),
  };

  return { mockSupabase, mockSelect, mockEq, mockDelete, mockIn, mockLt, mockOr };
});

vi.mock('../../api/lib/supabase.js', () => ({
  supabase: mockSupabase
}));

describe('cleanupOldRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default chain behavior re-setup if needed, but the hoisted one sets structure.
    // We mainly need to reset return values.
    
    // Default implementation for .from()
    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'webhooks') return { select: mockSelect };
        if (table === 'requests') return { delete: mockDelete };
        return {};
    });
  });

  it('should find free users and delete old requests', async () => {
    // Setup mock data for webhooks
    const mockWebhooks = [
      { token: 'token1', user: { role: 'user' } },
      { token: 'token2', user: { role: 'user' } }
    ];
    
    // Step 1: Get webhooks
    mockEq.mockResolvedValue({ data: mockWebhooks, error: null });

    // Step 2: Delete requests
    mockLt.mockResolvedValue({ count: 5, error: null });

    await cleanupOldRequests();

    // Verify Step 1
    expect(mockSupabase.from).toHaveBeenCalledWith('webhooks');
    expect(mockSelect).toHaveBeenCalledWith('token, user:users!inner(role)');
    expect(mockEq).toHaveBeenCalledWith('user.role', 'user');

    // Verify Step 2
    expect(mockSupabase.from).toHaveBeenCalledWith('requests');
    expect(mockDelete).toHaveBeenCalledWith({ count: 'exact' });
    expect(mockIn).toHaveBeenCalledWith('webhook_token', ['token1', 'token2']);
    expect(mockLt).toHaveBeenCalledWith('timestamp', expect.any(String));
  });

  it('should do nothing if no free user webhooks found', async () => {
    // Setup mock data for webhooks (empty)
    mockEq.mockResolvedValue({ data: [], error: null });

    await cleanupOldRequests();

    expect(mockSupabase.from).toHaveBeenCalledWith('webhooks');
    expect(mockSupabase.from).not.toHaveBeenCalledWith('requests');
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockEq.mockResolvedValue({ data: null, error: new Error('DB Error') });

    await cleanupOldRequests();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
