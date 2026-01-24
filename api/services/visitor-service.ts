const SESSION_TIMEOUT_MS = 60 * 1000; // 60 seconds failsafe (client should heartbeat every 30s)

class VisitorService {
  private activeSessions: Map<string, number> = new Map();
  private maxActiveVisitors: number = 0;

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), 10000); // Check every 10s
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
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [sessionId, lastSeen] of this.activeSessions.entries()) {
      if (now - lastSeen > SESSION_TIMEOUT_MS) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

export const visitorService = new VisitorService();
