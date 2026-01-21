import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { format } from 'date-fns';

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
  url: string;
  expiresAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function useWebhook() {
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected, joinWebhook, leaveWebhook } = useSocket();

  // Generate new webhook
  const generateWebhook = useCallback(async (expiresIn: number = 60) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/webhooks/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate webhook');
      }

      const data = await response.json();
      if (data.success) {
        setWebhook({
          token: data.token,
          url: data.url,
          expiresAt: data.expiresAt,
        });
        
        // Join socket room for this webhook
        joinWebhook(data.token);
        
        // Load initial requests
        await fetchRequests(data.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate webhook');
    } finally {
      setLoading(false);
    }
  }, [joinWebhook]);

  // Fetch requests for a webhook
  const fetchRequests = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/webhooks/${token}/requests`);
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  }, []);

  // Listen for new requests via socket
  useEffect(() => {
    if (!socket || !webhook) return;

    const handleNewRequest = (request: WebhookRequest) => {
      if (request.webhook_token === webhook.token) {
        setRequests((prev) => [request, ...prev]);
      }
    };

    socket.on('new-request', handleNewRequest);

    return () => {
      socket.off('new-request', handleNewRequest);
    };
  }, [socket, webhook]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webhook) {
        leaveWebhook(webhook.token);
      }
    };
  }, [webhook, leaveWebhook]);

  const deleteWebhook = useCallback(async () => {
    if (!webhook) return;
    
    try {
      const response = await fetch(`${API_URL}/webhooks/${webhook.token}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        leaveWebhook(webhook.token);
        setWebhook(null);
        setRequests([]);
      }
    } catch (err) {
      console.error('Error deleting webhook:', err);
    }
  }, [webhook, leaveWebhook]);

  return {
    webhook,
    requests,
    loading,
    error,
    isConnected,
    generateWebhook,
    fetchRequests,
    deleteWebhook,
  };
}
