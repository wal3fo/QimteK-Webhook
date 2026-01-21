/**
 * Supabase PostgreSQL database adapter
 * Works seamlessly with Vercel serverless functions
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseAdapter } from './db-adapter.js';

class SupabaseDatabase implements DatabaseAdapter {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    // Prefer SERVICE_ROLE_KEY over ANON_KEY for server-side operations
    // SERVICE_ROLE_KEY bypasses RLS and is required for serverless functions
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase credentials not found. ' +
        'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.'
      );
    }

    // Warn if using ANON_KEY instead of SERVICE_ROLE_KEY in production
    if ((process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn(
        '⚠️  WARNING: Using SUPABASE_ANON_KEY instead of SUPABASE_SERVICE_ROLE_KEY. ' +
        'SERVICE_ROLE_KEY is recommended for serverless functions to bypass RLS.'
      );
    }

    // Create Supabase client with explicit schema configuration
    this.client = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public', // Explicitly set schema to 'public'
      },
      auth: {
        persistSession: false, // Not needed for serverless
      },
    });

    console.log('Supabase client initialized with URL:', supabaseUrl.replace(/\/\/.*@/, '//***@'));
  }

  prepare(sql: string) {
    return {
      run: async (...params: any[]) => {
        let changes = 0;

        // Handle INSERT INTO webhooks
        if (sql.includes('INSERT INTO webhooks')) {
          const token = params[0];
          const expiresAt = params[1];
          const isActive = params[2] !== undefined ? params[2] : true;

          // Ensure expiresAt is a valid ISO string
          const expiresAtISO = expiresAt instanceof Date 
            ? expiresAt.toISOString() 
            : typeof expiresAt === 'string' 
              ? expiresAt 
              : new Date(expiresAt).toISOString();

          const { data, error } = await this.client
            .from('webhooks')
            .insert({
              token,
              created_at: new Date().toISOString(),
              expires_at: expiresAtISO,
              is_active: isActive,
            })
            .select()
            .single();

          if (error) {
            console.error('Supabase insert webhook error:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            console.error('Attempted insert:', { token, expires_at: expiresAtISO, is_active: isActive });
            throw new Error(`Failed to insert webhook: ${error.message} (code: ${error.code})`);
          }
          changes = 1;
        }
        // Handle INSERT INTO requests
        else if (sql.includes('INSERT INTO requests')) {
          const requestData = {
            id: params[0],
            webhook_token: params[1],
            method: params[2],
            url: params[3],
            headers: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4],
            body: params[5] ? (typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5]) : null,
            query: params[6] ? (typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6]) : null,
            timestamp: params[7] || new Date().toISOString(),
            ip_address: params[8] || null,
          };

          const { error } = await this.client
            .from('requests')
            .insert(requestData);

          if (error) {
            console.error('Supabase insert request error:', error);
            throw error;
          }
          changes = 1;
        }
        // Handle DELETE FROM webhooks
        else if (sql.includes('DELETE FROM webhooks')) {
          if (sql.includes('WHERE token = ?')) {
            const token = params[0];
            const { error } = await this.client
              .from('webhooks')
              .delete()
              .eq('token', token);

            if (error) {
              console.error('Supabase delete webhook error:', error);
              throw error;
            }
            changes = 1;
          } else if (sql.includes('expires_at < datetime') || sql.includes('is_active = 0')) {
            const now = new Date().toISOString();
            // Find expired or inactive webhooks using OR condition
            const { data, error } = await this.client
              .from('webhooks')
              .select('token')
              .or(`expires_at.lt.${now},is_active.eq.false`);

            if (error) {
              console.error('Supabase select expired webhooks error:', error);
              throw error;
            }

            if (data && data.length > 0) {
              const tokens = data.map((w: any) => w.token);
              // Delete expired webhooks (cascade will delete associated requests)
              const { error: deleteError } = await this.client
                .from('webhooks')
                .delete()
                .in('token', tokens);

              if (deleteError) {
                console.error('Supabase delete expired webhooks error:', deleteError);
                throw deleteError;
              }
              changes = data.length;
            }
          }
        }

        return { changes };
      },

      get: async (...params: any[]) => {
        // Handle SELECT COUNT(*) FROM requests WHERE webhook_token = ?
        if (sql.includes('SELECT COUNT(*)') && sql.includes('requests') && sql.includes('webhook_token = ?')) {
          const token = params[0];
          const { count, error } = await this.client
            .from('requests')
            .select('*', { count: 'exact', head: true })
            .eq('webhook_token', token);

          if (error) {
            console.error('Supabase count requests error:', error);
            throw error;
          }
          return { count: count || 0 };
        }

        // Handle SELECT FROM webhooks WHERE token = ?
        if (sql.includes('SELECT') && sql.includes('webhooks') && sql.includes('token = ?')) {
          const token = params[0];
          const now = new Date().toISOString();
          const { data, error } = await this.client
            .from('webhooks')
            .select('*')
            .eq('token', token)
            .eq('is_active', true)
            .gt('expires_at', now)
            .single();

          if (error || !data) {
            return undefined;
          }
          // Convert boolean to number for compatibility
          return {
            ...data,
            is_active: data.is_active ? 1 : 0,
          };
        }

        // Handle SELECT FROM requests WHERE id = ?
        if (sql.includes('SELECT') && sql.includes('requests') && sql.includes('id = ?')) {
          const id = params[0];
          const { data, error } = await this.client
            .from('requests')
            .select('*')
            .eq('id', id)
            .single();

          if (error || !data) {
            return undefined;
          }

          // Convert to format expected by the code
          return {
            id: data.id,
            webhook_token: data.webhook_token,
            method: data.method,
            url: data.url,
            headers: typeof data.headers === 'string' ? data.headers : JSON.stringify(data.headers),
            body: data.body ? (typeof data.body === 'string' ? data.body : JSON.stringify(data.body)) : null,
            query: data.query ? (typeof data.query === 'string' ? data.query : JSON.stringify(data.query)) : null,
            timestamp: data.timestamp,
            ip_address: data.ip_address,
          };
        }

        return undefined;
      },

      all: async (...params: any[]) => {
        // Handle SELECT FROM requests WHERE webhook_token = ?
        if (sql.includes('SELECT') && sql.includes('requests') && sql.includes('webhook_token = ?')) {
          const token = params[0];
          const limit = parseInt(params[1] as string) || 100;
          const offset = parseInt(params[2] as string) || 0;

          const { data, error } = await this.client
            .from('requests')
            .select('*')
            .eq('webhook_token', token)
            .order('timestamp', { ascending: false })
            .range(offset, offset + limit - 1);

          if (error) {
            console.error('Supabase select requests error:', error);
            throw error;
          }

          if (!data) return [];

          // Convert to format expected by the code
          return data.map((req: any) => ({
            id: req.id,
            webhook_token: req.webhook_token,
            method: req.method,
            url: req.url,
            headers: typeof req.headers === 'string' ? req.headers : JSON.stringify(req.headers),
            body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : null,
            query: req.query ? (typeof req.query === 'string' ? req.query : JSON.stringify(req.query)) : null,
            timestamp: req.timestamp,
            ip_address: req.ip_address,
          }));
        }

        return [];
      },
    };
  }

  exec(sql: string): void {
    // Schema creation is handled via migrations
    // This is a no-op for Supabase
  }

  pragma(setting: string): void {
    // SQLite pragma - no-op for Supabase
  }
}

let supabaseDb: SupabaseDatabase | null = null;

export function getSupabaseDb(): SupabaseDatabase {
  if (!supabaseDb) {
    supabaseDb = new SupabaseDatabase();
  }
  return supabaseDb;
}

export default supabaseDb;
