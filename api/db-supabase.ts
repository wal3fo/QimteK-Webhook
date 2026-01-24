
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Database interface matching better-sqlite3 API
class SupabaseDatabase {
  private client: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.key);
    console.log('🔌 Connected to Supabase');
  }

  prepare(rawSql: string) {
    // Normalize SQL for easier parsing
    const sql = rawSql.replace(/\s+/g, ' ').trim();

    return {
      run: async (...params: any[]) => {
        // Users Table Operations
        if (sql.includes('INSERT INTO users')) {
          const [id, email, password_hash, role = 'user', is_verified = false, verification_token, verification_token_expires_at] = params;
          const { error } = await this.client.from('users').insert({
            id,
            email,
            password_hash,
            role,
            is_verified: is_verified ? true : false,
            verification_token,
            verification_token_expires_at,
            created_at: new Date().toISOString()
          });
          if (error) throw error;
          return { changes: 1 };
        }

        if (sql.includes('UPDATE users SET is_verified = 1')) {
          // UPDATE users SET is_verified = 1, verification_token = NULL, verification_token_expires_at = NULL WHERE id = ?
          const id = params[0];
          const { error } = await this.client.from('users').update({
            is_verified: true,
            verification_token: null,
            verification_token_expires_at: null
          }).eq('id', id);
          if (error) throw error;
          return { changes: 1 };
        }

        if (sql.includes('UPDATE users SET password_hash = ?')) {
          const [password_hash, id] = params;
          const { error } = await this.client.from('users').update({ password_hash }).eq('id', id);
          if (error) throw error;
          return { changes: 1 };
        }

        if (sql.includes('UPDATE users SET mfa_secret = ?, mfa_enabled = ?')) {
          const [mfa_secret, mfa_enabled, id] = params;
          const { error } = await this.client.from('users').update({ mfa_secret, mfa_enabled: mfa_enabled ? true : false }).eq('id', id);
          if (error) throw error;
          return { changes: 1 };
        }

        // Webhooks Table Operations
        if (sql.includes('INSERT INTO webhooks')) {
          const [token, user_id, name, expires_at] = params;
          const { error } = await this.client.from('webhooks').insert({
            token,
            user_id,
            name,
            expires_at,
            is_active: true,
            created_at: new Date().toISOString()
          });
          if (error) throw error;
          return { changes: 1 };
        }

        if (sql.includes('DELETE FROM webhooks')) {
          if (sql.includes('WHERE token = ?') && sql.includes('user_id = ?')) {
            const [token, user_id] = params;
            const { error } = await this.client.from('webhooks').delete().match({ token, user_id });
            if (error) throw error;
            return { changes: 1 }; // Approximate
          }
          if (sql.includes('WHERE token = ?')) {
            const [token] = params;
            const { error } = await this.client.from('webhooks').delete().eq('token', token);
            if (error) throw error;
            return { changes: 1 };
          }
          // Handle cleanup of expired webhooks
          if (sql.includes('expires_at < datetime')) {
            const { error } = await this.client.from('webhooks').delete().lt('expires_at', new Date().toISOString());
            if (error) throw error;
            return { changes: 1 };
          }
        }

        // Requests Table Operations
        if (sql.includes('INSERT INTO requests')) {
          const [id, webhook_token, method, url, headers, body, query, ip_address] = params;
          const { error } = await this.client.from('requests').insert({
            id,
            webhook_token,
            method,
            url,
            headers,
            body,
            query,
            ip_address,
            timestamp: new Date().toISOString()
          });
          if (error) throw error;
          return { changes: 1 };
        }

        if (sql.includes('DELETE FROM requests WHERE webhook_token = ?')) {
          // Often part of limit enforcement
          // DELETE FROM requests WHERE webhook_token = ? AND id NOT IN (SELECT id FROM requests WHERE webhook_token = ? ORDER BY timestamp DESC LIMIT ?)
          // Complex queries might need specific handling or be simplified
          // For now, if it's the specific retention query:
          if (sql.includes('NOT IN')) {
            // This is complex to map 1:1 to simple Supabase calls without RPC or raw query if enabled.
            // For now, we might skip strict retention enforcement in this simple adapter or implement it in two steps.
            // Step 1: Get IDs to keep
            const [token1, token2, limit] = params; // token1 should equal token2
            const { data: keepIds } = await this.client.from('requests')
              .select('id')
              .eq('webhook_token', token1)
              .order('timestamp', { ascending: false })
              .limit(limit);

            if (keepIds && keepIds.length > 0) {
              const idsToKeep = keepIds.map(r => r.id);
              const { error } = await this.client.from('requests')
                .delete()
                .eq('webhook_token', token1)
                .not('id', 'in', `(${idsToKeep.join(',')})`); // Syntax might need adjustment for SDK
              // Alternative: fetch all, filter in memory, delete. (Inefficient for huge data)
            }
          }
        }

        return { changes: 0 };
      },

      get: async (...params: any[]) => {
        // User Lookups
        if (sql.includes('SELECT * FROM users WHERE email = ?')) {
          const [email] = params;
          const { data, error } = await this.client.from('users').select('*').eq('email', email).single();
          if (error) return undefined;
          return data;
        }
        if (sql.includes('SELECT * FROM users WHERE id = ?')) {
          const [id] = params;
          const { data, error } = await this.client.from('users').select('*').eq('id', id).single();
          if (error) return undefined;
          return data;
        }
        if (sql.includes('SELECT * FROM users WHERE verification_token = ?')) {
          const [token] = params;
          const { data, error } = await this.client.from('users').select('*').eq('verification_token', token).single();
          if (error) return undefined;
          return data;
        }

        // Webhook Lookups
        if (sql.includes('SELECT * FROM webhooks WHERE token = ?')) {
          const [token] = params;
          // Check if user_id check is included
          if (sql.includes('user_id = ?')) {
            const userId = params[1];
            const { data, error } = await this.client.from('webhooks').select('*').eq('token', token).eq('user_id', userId).single();
            if (error) return undefined;
            return data;
          }
          const { data, error } = await this.client.from('webhooks').select('*').eq('token', token).single();
          if (error) return undefined;
          return data;
        }

        // Request Lookups
        if (sql.includes('SELECT r.* FROM requests r')) {
          // Single request lookup with join (simplified for NoSQL-like access if possible, or two steps)
          // SELECT r.* FROM requests r INNER JOIN webhooks w ON r.webhook_token = w.token WHERE r.id = ? AND w.user_id = ?
          if (sql.includes('id = ?') && sql.includes('user_id = ?')) {
            const [requestId, userId] = params;
            // Join simulation
            const { data: request } = await this.client.from('requests').select('*').eq('id', requestId).single();
            if (!request) return undefined;

            const { data: webhook } = await this.client.from('webhooks').select('user_id').eq('token', request.webhook_token).single();
            if (webhook && webhook.user_id === userId) {
              return request;
            }
            return undefined;
          }
        }

        return undefined;
      },

      all: async (...params: any[]) => {
        if (sql.includes('SELECT * FROM webhooks WHERE user_id = ?')) {
          const [userId] = params;
          const { data, error } = await this.client.from('webhooks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
          if (error) return [];
          return data;
        }

        if (sql.includes('SELECT * FROM requests WHERE webhook_token = ?')) {
          const [token] = params;
          const { data, error } = await this.client.from('requests').select('*').eq('webhook_token', token).order('timestamp', { ascending: false }).limit(100); // Default limit
          if (error) return [];
          return data;
        }

        if (sql.includes('SELECT * FROM users')) {
          const { data, error } = await this.client.from('users').select('*');
          if (error) return [];
          return data;
        }

        return [];
      }
    };
  }

  exec(sql: string) {
    // Try to execute via RPC if available (common pattern for Supabase helpers)
    // Otherwise log the instruction
    this.client.rpc('exec_sql', { sql }).then(({ error }) => {
      if (error) {
        console.log('⚠️  Could not execute SQL via RPC (exec_sql). If you need to apply schema, run this SQL in Supabase Dashboard:');
        console.log('---------------------------------------------------');
        console.log(sql);
        console.log('---------------------------------------------------');
      } else {
        console.log('✅ SQL executed via RPC');
      }
    });

    return { changes: 0 };
  }

  async hasTable(tableName: string): Promise<boolean> {
    const { error } = await this.client.from(tableName).select('id').limit(1);
    // code 42P01 means undefined_table
    if (error && error.code === '42P01') {
      return false;
    }
    return true;
  }

  pragma(setting: string) {
    // No-op for Supabase
    return;
  }
}

let dbInstance: SupabaseDatabase | null = null;

export async function initSupabaseDb(): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error('Supabase credentials missing (SUPABASE_URL, SUPABASE_KEY)');
  }
  dbInstance = new SupabaseDatabase({
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  });
}

export { dbInstance as supabaseDb };
export default SupabaseDatabase;
