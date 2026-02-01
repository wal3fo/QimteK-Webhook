import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WebhookDetails from '../pages/WebhookDetails';
import { useAuth } from '../hooks/useAuth';
import { useWebhook } from '../hooks/useWebhook';
import { Link } from 'react-router-dom';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'test-token' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useWebhook', () => ({
  useWebhook: vi.fn(),
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => <div>LineChart</div>,
  Line: () => <div>Line</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  PieChart: () => <div>PieChart</div>,
  Pie: () => <div>Pie</div>,
  Cell: () => <div>Cell</div>,
  AreaChart: () => <div>AreaChart</div>,
  Area: () => <div>Area</div>,
}));

// Mock child components
vi.mock('../components/Logo', () => ({ default: () => <div>Logo</div> }));
vi.mock('../components/Footer', () => ({ default: () => <div>Footer</div> }));
vi.mock('../components/ConfirmModal', () => ({ default: () => <div>ConfirmModal</div> }));
vi.mock('../components/SEO', () => ({ default: () => <div>SEO</div> }));

describe('WebhookDetails', () => {
  const mockRequests = [
    { id: '1', method: 'POST', url: '/webhook/test', timestamp: new Date().toISOString(), body: 'test body', size: 100 },
    { id: '2', method: 'GET', url: '/webhook/test2', timestamp: new Date().toISOString(), body: 'test2 body', size: 50 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (useAuth as any).mockReturnValue({
      user: { role: 'Professional' },
      isAuthenticated: true,
      token: 'auth-token'
    });

    (useWebhook as any).mockReturnValue({
      selectedWebhook: { name: 'Test Webhook', token: 'test-token', is_active: true, url: 'http://test.com' },
      webhooks: [], // Add this line
      requests: mockRequests,
      loading: false,
      fetchRequests: vi.fn(),
      fetchWebhook: vi.fn(),
      deleteWebhook: vi.fn(),
      setSelectedWebhook: vi.fn(),
      fetchWebhooks: vi.fn(), // Ensure this is mocked too
    });

    // Mock URL.createObjectURL for export functionality
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders and shows requests tab with data', () => {
    render(<WebhookDetails />);

    // Switch to requests tab
    const requestsTabs = screen.getAllByText(/Requests/);
    fireEvent.click(requestsTabs[0]); // Click the first one found (likely the tab)

    expect(screen.getByText('/webhook/test')).toBeInTheDocument();
    expect(screen.getByText('/webhook/test2')).toBeInTheDocument();
  });

  it('shows export button for authenticated users', () => {
    render(<WebhookDetails />);

    // Switch to requests tab
    const requestsTabs = screen.getAllByText(/Requests/);
    fireEvent.click(requestsTabs[0]);

    // Check for Export button
    const exportBtn = screen.getByText('Export');
    expect(exportBtn).toBeInTheDocument();
  });

  it('allows filtering by method for Professional users', () => {
    render(<WebhookDetails />);

    const requestsTabs = screen.getAllByText(/Requests/);
    fireEvent.click(requestsTabs[0]);

    const select = screen.getByRole('combobox');
    expect(select).not.toBeDisabled();

    // Filter by POST
    fireEvent.change(select, { target: { value: 'POST' } });

    expect(screen.getByText('/webhook/test')).toBeInTheDocument();
    expect(screen.queryByText('/webhook/test2')).not.toBeInTheDocument();
  });

  it('disables filtering for Free users', () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'user' }, // Free plan
      isAuthenticated: true,
      token: 'auth-token'
    });

    render(<WebhookDetails />);

    const requestsTabs = screen.getAllByText(/Requests/);
    fireEvent.click(requestsTabs[0]);

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();

    const searchInput = screen.getByPlaceholderText('Search URL or Body...');
    expect(searchInput).toBeDisabled();
  });

  it('exports data when export option is clicked', () => {
    render(<WebhookDetails />);

    const requestsTabs = screen.getAllByText(/Requests/);
    fireEvent.click(requestsTabs[0]);

    // Hover or click to show dropdown (UI is hover group, but we can access buttons directly if in DOM)
    // The dropdown is in DOM but invisible. Testing library can usually find it.

    const exportJsonBtn = screen.getByText('Export JSON');
    fireEvent.click(exportJsonBtn);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('toggles webhook status when Disable/Enable button is clicked', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response);

    const setSelectedWebhook = vi.fn();
    (useWebhook as any).mockReturnValue({
      selectedWebhook: { name: 'Test Webhook', token: 'test-token', is_active: true, url: 'http://test.com' },
      webhooks: [],
      requests: mockRequests,
      loading: false,
      fetchRequests: vi.fn(),
      fetchWebhook: vi.fn(),
      deleteWebhook: vi.fn(),
      setSelectedWebhook,
      fetchWebhooks: vi.fn().mockResolvedValue(undefined),
    });

    render(<WebhookDetails />);

    const disableBtn = screen.getByText('Disable');
    fireEvent.click(disableBtn);

    await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/webhooks/test-token'),
          expect.objectContaining({
            method: 'PATCH',
            headers: expect.objectContaining({
              'Authorization': 'Bearer auth-token',
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ is_active: false })
          })
        );
    });

    expect(setSelectedWebhook).toHaveBeenCalledWith(expect.objectContaining({
        is_active: false
    }));
  });
});
