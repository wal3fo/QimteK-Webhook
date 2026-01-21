/**
 * Supabase Realtime hook for webhook request subscriptions
 * 
 * This replaces Socket.IO with Supabase Realtime, which works seamlessly
 * with Vercel serverless functions since it's a managed service.
 * 
 * Connection status:
 * - "Connected" = Supabase Realtime subscription is active
 * - "Disconnected" = Subscription failed or offline
 */

import { useEffect, useState, useRef } from 'react';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client (singleton)
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseClient;
}

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

export function useSupabaseRealtime(webhookToken: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Don't subscribe if no webhook token
    if (!webhookToken) {
      setIsConnected(false);
      return;
    }

    // Don't subscribe if Supabase credentials are missing
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not configured. Real-time updates disabled.');
      setIsConnected(false);
      setConnectionError('Supabase not configured');
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      // Create a channel for this webhook token
      // We'll listen to INSERT events on the requests table filtered by webhook_token
      const channel = supabase
        .channel(`webhook:${webhookToken}`, {
          config: {
            broadcast: { self: false },
            presence: { key: webhookToken },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'requests',
            filter: `webhook_token=eq.${webhookToken}`,
          },
          (payload) => {
            // This callback will be called when a new request is inserted
            // The payload.new contains the new row data
            console.log('New webhook request received via Realtime:', payload.new);
          }
        )
        .subscribe((status) => {
          console.log('Supabase Realtime subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionError(null);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setIsConnected(false);
            setConnectionError(`Connection ${status.toLowerCase()}`);
          } else if (status === 'CLOSED') {
            setIsConnected(false);
          }
        });

      channelRef.current = channel;

      // Cleanup on unmount or token change
      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Error setting up Supabase Realtime:', error);
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [webhookToken]);

  return {
    isConnected,
    connectionError,
  };
}

/**
 * Subscribe to new webhook requests for a specific token
 * Returns a callback that will be called when new requests arrive
 */
export function useWebhookRequestSubscription(
  webhookToken: string | null,
  onNewRequest: (request: WebhookRequest) => void
) {
  const callbackRef = useRef(onNewRequest);
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onNewRequest;
  }, [onNewRequest]);

  useEffect(() => {
    if (!webhookToken) return;
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not configured. Real-time updates disabled.');
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      const channel = supabase
        .channel(`webhook-requests:${webhookToken}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'requests',
            filter: `webhook_token=eq.${webhookToken}`,
          },
          (payload) => {
            // Parse the new request data
            const newRequest = payload.new as any;
            
            // Parse JSON fields if they're strings
            const parseJsonField = (field: any): any => {
              if (!field) return null;
              if (typeof field === 'object') return field;
              if (typeof field === 'string') {
                try {
                  return JSON.parse(field);
                } catch {
                  return field;
                }
              }
              return field;
            };

            // Parse headers - ensure it's always a Record<string, string>
            const parsedHeaders = parseJsonField(newRequest.headers);
            const headers: Record<string, string> = 
              typeof parsedHeaders === 'object' && parsedHeaders !== null && !Array.isArray(parsedHeaders)
                ? parsedHeaders as Record<string, string>
                : typeof parsedHeaders === 'string'
                  ? (() => {
                      try {
                        const parsed = JSON.parse(parsedHeaders);
                        return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, string> : {};
                      } catch {
                        return {};
                      }
                    })()
                  : {};

            const request: WebhookRequest = {
              id: newRequest.id,
              webhook_token: newRequest.webhook_token,
              method: newRequest.method,
              url: newRequest.url,
              headers,
              body: parseJsonField(newRequest.body),
              query: parseJsonField(newRequest.query),
              timestamp: newRequest.timestamp,
              ip_address: newRequest.ip_address,
            };

            // Call the callback with the new request
            callbackRef.current(request);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error subscribing to webhook requests:', error);
    }
  }, [webhookToken]);
}
