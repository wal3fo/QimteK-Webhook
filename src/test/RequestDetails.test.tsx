import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RequestDetails from '../pages/RequestDetails';
import { useAuth } from '../hooks/useAuth';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'token123', id: 'req123' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock components
vi.mock('../components/Logo', () => ({ default: () => <div>Logo</div> }));
vi.mock('../components/Footer', () => ({ default: () => <div>Footer</div> }));
vi.mock('../components/SEO', () => ({ default: () => <div>SEO</div> }));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;
global.alert = vi.fn();

describe('RequestDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: { role: 'Professional' },
      token: 'auth-token',
      loading: false
    });

    // Mock successful request fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        request: {
          id: 'req123',
          webhook_token: 'token123',
          method: 'POST',
          url: 'http://example.com/webhook',
          headers: { 'content-type': 'application/json' },
          body: { key: 'value' },
          timestamp: new Date().toISOString(),
          ip_address: '127.0.0.1'
        }
      })
    });
  });

  it('renders request details', async () => {
    render(<RequestDetails />);

    await waitFor(() => {
      expect(screen.getByText('POST')).toBeInTheDocument();
      expect(screen.getByText('req123')).toBeInTheDocument();
    });
  });

  it('shows replay button enabled for Professional users', async () => {
    render(<RequestDetails />);

    await waitFor(() => {
      const btn = screen.getByText('Replay').closest('button');
      expect(btn).toBeEnabled();
    });
  });

  it('shows replay button disabled for Free users', async () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'user' },
      token: 'auth-token',
      loading: false
    });

    render(<RequestDetails />);

    await waitFor(() => {
      const btn = screen.getByText('Replay').closest('button');
      expect(btn).toBeDisabled();
      // Check for tooltip content (might be in DOM even if hidden)
      expect(screen.getByText('Pro Feature')).toBeInTheDocument();
    });
  });

  it('handles replay action successfully', async () => {
    render(<RequestDetails />);

    await waitFor(() => {
      expect(screen.getByText('Replay')).toBeInTheDocument();
    });

    // Mock replay response
    mockFetch.mockImplementation((url) => {
      if (url.includes('/replay')) {
        return Promise.resolve({
          json: async () => ({ success: true })
        });
      }
      // Initial fetch
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          request: {
            id: 'req123',
            webhook_token: 'token123',
            method: 'POST',
            url: 'http://example.com/webhook',
            headers: {},
            body: {},
            timestamp: new Date().toISOString()
          }
        })
      });
    });

    const replayBtn = screen.getByText('Replay');
    fireEvent.click(replayBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/replay'), expect.objectContaining({ method: 'POST' }));
      expect(global.alert).toHaveBeenCalledWith('Request replayed successfully');
    });
  });
});
