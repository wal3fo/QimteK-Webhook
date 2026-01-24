import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from './useAuth';

export interface WebhookRequest {
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

export interface Webhook {
  token: string;
  name?: string;
  url: string;
  expiresAt: string;
  created_at?: string;
  is_active?: boolean;
}

import { API_URL } from '@/config/api';

const WEBHOOK_STORAGE_KEY = 'last_selected_webhook_token';

export function useWebhook() {
  const { token: authToken, isAuthenticated } = useAuth();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }, [authToken]);

  // Persist selected webhook
  useEffect(() => {
    if (selectedWebhook) {
      localStorage.setItem(WEBHOOK_STORAGE_KEY, selectedWebhook.token);
    }
  }, [selectedWebhook]);

  // Load all webhooks for the user
  const fetchWebhooks = useCallback(async () => {
    if (!isAuthenticated || !authToken) return;

    try {
      const response = await fetch(`${API_URL}/webhooks`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const fetchedWebhooks = data.webhooks || [];
          setWebhooks(fetchedWebhooks);

          // Logic to select webhook: Stored > First Available
          if (!selectedWebhook && fetchedWebhooks.length > 0) {
            const storedToken = localStorage.getItem(WEBHOOK_STORAGE_KEY);
            let webhookToSelect = null;

            if (storedToken) {
              webhookToSelect = fetchedWebhooks.find((w: Webhook) => w.token === storedToken);
            }

            if (!webhookToSelect) {
              webhookToSelect = fetchedWebhooks[0];
            }

            setSelectedWebhook(webhookToSelect);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching webhooks:', err);
    }
  }, [isAuthenticated, authToken, getAuthHeaders, selectedWebhook]);

  // Load webhooks on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchWebhooks();
    } else {
      setWebhooks([]);
      setSelectedWebhook(null);
      setRequests([]);
    }
  }, [isAuthenticated, fetchWebhooks]);

  // Fetch requests for the selected webhook
  const fetchRequests = useCallback(async (webhookToken: string) => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_URL}/webhooks/${webhookToken}/requests`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRequests(data.requests || []);
        }
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  }, [authToken, getAuthHeaders]);

  // Fetch requests when selected webhook changes
  useEffect(() => {
    if (selectedWebhook && isAuthenticated) {
      fetchRequests(selectedWebhook.token);
    } else {
      setRequests([]);
    }
  }, [selectedWebhook, isAuthenticated, fetchRequests]);

  // Generate new webhook
  const generateWebhook = useCallback(async (expiresIn: number = 60, name?: string, alias?: string) => {
    if (!authToken) {
      setError('Please login to generate webhooks');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/webhooks/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ expiresIn, name, alias }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate webhook');
      }

      const data = await response.json();
      if (data.success) {
        const newWebhook = {
          token: data.token,
          name: data.name,
          url: data.url,
          expiresAt: data.expiresAt,
        };

        // Add to webhooks list and select it
        setWebhooks(prev => [newWebhook, ...prev]);
        setSelectedWebhook(newWebhook);

        // Load initial requests
        await fetchRequests(data.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate webhook');
    } finally {
      setLoading(false);
    }
  }, [authToken, getAuthHeaders, fetchRequests]);

  const deleteWebhook = useCallback(async (webhookToken: string) => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_URL}/webhooks/${webhookToken}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        // Remove from list
        setWebhooks(prev => prev.filter(w => w.token !== webhookToken));

        // If deleted webhook was selected, select another or clear
        if (selectedWebhook?.token === webhookToken) {
          const remaining = webhooks.filter(w => w.token !== webhookToken);
          setSelectedWebhook(remaining.length > 0 ? remaining[0] : null);
          setRequests([]);
        }
      }
    } catch (err) {
      console.error('Error deleting webhook:', err);
    }
  }, [authToken, getAuthHeaders, selectedWebhook, webhooks]);

  // Poll for new requests periodically
  useEffect(() => {
    if (!selectedWebhook || !isAuthenticated) {
      setIsConnected(false);
      return;
    }

    setIsConnected(true);

    const pollInterval = setInterval(() => {
      fetchRequests(selectedWebhook.token);
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(pollInterval);
      setIsConnected(false);
    };
  }, [selectedWebhook, isAuthenticated, fetchRequests]);

  return {
    webhooks,
    selectedWebhook,
    requests,
    loading,
    error,
    isConnected,
    generateWebhook,
    fetchRequests,
    deleteWebhook,
    setSelectedWebhook,
    fetchWebhooks,
  };
}
