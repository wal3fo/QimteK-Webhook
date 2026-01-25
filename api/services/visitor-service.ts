import { supabase } from '../lib/supabase.js';

const SESSION_TIMEOUT_MS = 60 * 1000; // 60 seconds failsafe

class VisitorService {
  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), 10000); // Check every 10s
  }

  public async join(sessionId: string): Promise<void> {
    try {
      await supabase.from('visitor_sessions').upsert({
        session_id: sessionId,
        last_seen: new Date().toISOString()
      });
      this.updateMax();
    } catch (error) {
      console.error('Error in visitor join:', error);
    }
  }

  public async leave(sessionId: string): Promise<void> {
    try {
      await supabase.from('visitor_sessions').delete().eq('session_id', sessionId);
    } catch (error) {
      console.error('Error in visitor leave:', error);
    }
  }

  public async heartbeat(sessionId: string): Promise<void> {
    try {
      await supabase.from('visitor_sessions').upsert({
        session_id: sessionId,
        last_seen: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in visitor heartbeat:', error);
    }
  }

  public async getStats(): Promise<{ activeVisitors: number; maxActiveVisitors: number }> {
    try {
      // Get active count
      const { count, error } = await supabase
        .from('visitor_sessions')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      const currentCount = count || 0;

      // Get max count from system_config
      const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'max_active_visitors')
        .maybeSingle();

      let maxActiveVisitors = config?.value?.count || 0;

      // If current is higher, update max immediately (read-through)
      if (currentCount > maxActiveVisitors) {
        maxActiveVisitors = currentCount;
        // Async update to DB
        this.updateMax(); 
      }

      return {
        activeVisitors: currentCount,
        maxActiveVisitors,
      };
    } catch (error) {
      console.error('Error getting visitor stats:', error);
      return { activeVisitors: 0, maxActiveVisitors: 0 };
    }
  }

  private async updateMax() {
    try {
      const { count } = await supabase
        .from('visitor_sessions')
        .select('*', { count: 'exact', head: true });
      
      const currentCount = count || 0;

      const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'max_active_visitors')
        .maybeSingle();
      
      const storedMax = config?.value?.count || 0;

      if (currentCount > storedMax) {
        await supabase.from('system_config').upsert({
          key: 'max_active_visitors',
          value: { count: currentCount },
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating max visitors:', error);
    }
  }

  private async cleanup() {
    try {
      const timeoutDate = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();
      await supabase
        .from('visitor_sessions')
        .delete()
        .lt('last_seen', timeoutDate);
    } catch (error) {
      console.error('Error cleaning up visitors:', error);
    }
  }
}

export const visitorService = new VisitorService();
