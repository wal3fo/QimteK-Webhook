import { useState, useEffect, useCallback } from 'react';
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

const STORAGE_KEY = 'webhook_session';

export function useWebhook() {
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Load webhook from localStorage on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const session = JSON.parse(saved);
          // Verify webhook still exists and is valid
          const response = await fetch(`${API_URL}/webhooks/${session.token}/requests?limit=1`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Webhook is still valid, restore it
              setWebhook({
                token: session.token,
                url: session.url,
                expiresAt: session.expiresAt,
              });
              // Load all requests
              const requestsResponse = await fetch(`${API_URL}/webhooks/${session.token}/requests`);
              if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json();
                if (requestsData.success) {
                  setRequests(requestsData.requests || []);
                }
              }
            } else {
              // Webhook expired or invalid, clear storage
              localStorage.removeItem(STORAGE_KEY);
            }
          } else {
            // Webhook not found, clear storage
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Error loading session:', err);
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Save webhook to localStorage whenever it changes
  useEffect(() => {
    if (webhook) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token: webhook.token,
        url: webhook.url,
        expiresAt: webhook.expiresAt,
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [webhook]);

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
        const newWebhook = {
          token: data.token,
          url: data.url,
          expiresAt: data.expiresAt,
        };
        setWebhook(newWebhook);
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWebhook));
        
        // Load initial requests
        await fetchRequests(data.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate webhook');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const deleteWebhook = useCallback(async () => {
    if (!webhook) return;
    
    try {
      const response = await fetch(`${API_URL}/webhooks/${webhook.token}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWebhook(null);
        setRequests([]);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('Error deleting webhook:', err);
    }
  }, [webhook]);

  // Poll for new requests periodically
  useEffect(() => {
    if (!webhook) {
      setIsConnected(false);
      return;
    }
    
    // Set connected status when polling starts
    setIsConnected(true);
    
    const pollInterval = setInterval(() => {
      fetchRequests(webhook.token);
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(pollInterval);
      setIsConnected(false);
    };
  }, [webhook, fetchRequests]);

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
