import fs from 'fs';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'visitor-stats.json');
const SESSION_TIMEOUT_MS = 60 * 1000; // 60 seconds failsafe (client should heartbeat every 30s)

interface VisitorStats {
  maxActiveVisitors: number;
}

class VisitorService {
  private activeSessions: Map<string, number> = new Map();
  private maxActiveVisitors: number = 0;

  constructor() {
    this.loadStats();
    // Start cleanup interval
    setInterval(() => this.cleanup(), 10000); // Check every 10s
  }

  private loadStats() {
    try {
      if (fs.existsSync(STATS_FILE)) {
        const data = fs.readFileSync(STATS_FILE, 'utf8');
        const stats: VisitorStats = JSON.parse(data);
        this.maxActiveVisitors = stats.maxActiveVisitors || 0;
      }
    } catch (error) {
      console.error('Failed to load visitor stats:', error);
    }
  }

  private saveStats() {
    try {
      const stats: VisitorStats = {
        maxActiveVisitors: this.maxActiveVisitors,
      };
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('Failed to save visitor stats:', error);
    }
  }

  public join(sessionId: string) {
    this.activeSessions.set(sessionId, Date.now());
    this.updateMax();
  }

  public leave(sessionId: string) {
    this.activeSessions.delete(sessionId);
  }

  public heartbeat(sessionId: string) {
    if (this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, Date.now());
    } else {
      // Re-join if session was lost/expired but user is back
      this.join(sessionId);
    }
  }

  public getStats() {
    return {
      activeVisitors: this.activeSessions.size,
      maxActiveVisitors: this.maxActiveVisitors,
    };
  }

  private updateMax() {
    const currentCount = this.activeSessions.size;
    if (currentCount > this.maxActiveVisitors) {
      this.maxActiveVisitors = currentCount;
      this.saveStats();
    }
  }

  private cleanup() {
    const now = Date.now();
    let changed = false;
    for (const [sessionId, lastSeen] of this.activeSessions.entries()) {
      if (now - lastSeen > SESSION_TIMEOUT_MS) {
        this.activeSessions.delete(sessionId);
        changed = true;
      }
    }
    // No need to update max on cleanup, only on join
  }
}

export const visitorService = new VisitorService();
