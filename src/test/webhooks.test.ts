import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import webhooksRouter from '../../api/routes/webhooks';

// Hoist mocks
const { mockSupabase, mockSelect, mockEq, mockSingle, mockInsert, mockAuthenticate } = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();

  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });

  const mockSupabase = {
    from: vi.fn(),
  };

  const mockAuthenticate = vi.fn((req, res, next) => {
    req.user = { id: 'user-123', role: 'Professional' };
    next();
  });

  return { mockSupabase, mockSelect, mockEq, mockSingle, mockInsert, mockAuthenticate };
});

vi.mock('../../api/lib/supabase.js', () => ({
  supabase: mockSupabase
}));

vi.mock('../../api/utils/auth.js', () => ({
  authenticate: mockAuthenticate,
  verifyToken: () => ({ id: 'user-123', role: 'Professional' }),
}));

vi.mock('../../api/utils/plan-storage.js', () => ({
  getPlans: async () => ({
    user: { features: { requestReplay: false } },
    Professional: { features: { requestReplay: true } },
    Administrator: { features: { requestReplay: true } },
  }),
}));

describe('Webhooks Router', () => {
  const app = express();
  app.use(express.json());
  app.use('/webhooks', webhooksRouter);

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset default user to Professional
    mockAuthenticate.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123', role: 'Professional' };
      next();
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'requests') {
        return { select: mockSelect, insert: mockInsert };
      }
      if (table === 'webhooks') {
        return { select: mockSelect };
      }
      return { select: mockSelect };
    });

    // Restore chain return values
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockReturnValue({ data: null, error: null }); // Default
    mockInsert.mockReturnValue({ error: null }); // Default
  });

  it('POST /webhooks/requests/:id/replay should replay request for Professional user', async () => {
    // Mock existing request
    const mockRequest = {
      id: 'req-1',
      webhook_token: 'token-1',
      method: 'POST',
      url: 'http://example.com',
      headers: {},
      body: {},
      query: {}
    };

    // Mock existing webhook ownership
    const mockWebhook = {
      user_id: 'user-123',
      token: 'token-1'
    };

    // Setup Supabase mocks
    // 1. Select request
    mockSingle.mockResolvedValueOnce({ data: mockRequest, error: null });
    // 2. Select webhook (ownership check)
    mockSingle.mockResolvedValueOnce({ data: mockWebhook, error: null });
    // 3. Insert new request
    mockInsert.mockResolvedValueOnce({ error: null });

    const res = await request(app)
      .post('/webhooks/requests/req-1/replay')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newId).toBeDefined();

    expect(mockSupabase.from).toHaveBeenCalledWith('requests');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      ip_address: 'REPLAY',
      webhook_token: 'token-1'
    }));
  });

  it('POST /webhooks/requests/:id/replay should deny access for Free user', async () => {
    // Mock Free user
    mockAuthenticate.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123', role: 'user' };
      next();
    });

    const res = await request(app)
      .post('/webhooks/requests/req-1/replay')
      .send();

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Professional plan');

    // Should NOT call DB
    // Wait, getPlans calls DB? No, we mocked getPlans.
    // Should not call Supabase for request/webhook if plan check fails early.
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('POST /webhooks/requests/:id/replay should return 404 if request not found', async () => {
    // 1. Select request -> null
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    const res = await request(app)
      .post('/webhooks/requests/req-missing/replay')
      .send();

    expect(res.status).toBe(404);
  });
});
