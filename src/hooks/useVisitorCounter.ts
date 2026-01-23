import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface VisitorStats {
  activeVisitors: number;
  maxActiveVisitors: number;
}

export function useVisitorCounter() {
  const [stats, setStats] = useState<VisitorStats>({ activeVisitors: 0, maxActiveVisitors: 0 });
  const sessionId = useRef<string>('');

  useEffect(() => {
    // Generate Session ID if not already set
    if (!sessionId.current) {
      sessionId.current = uuidv4();
    }

    // Join
    const join = async () => {
      try {
        await fetch(`${API_URL}/visitor/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId.current }),
        });
      } catch (err) {
        // Ignore network errors on join
      }
    };

    // Heartbeat and fetch stats
    const heartbeat = async () => {
      try {
        await fetch(`${API_URL}/visitor/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId.current }),
        });
        
        const res = await fetch(`${API_URL}/visitor/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        // Ignore network errors
      }
    };

    // Initial join
    join().then(heartbeat);

    // Periodic heartbeat (every 30s)
    const interval = setInterval(heartbeat, 30000);

    // Handle unload / tab close
    const handleUnload = () => {
      if (!sessionId.current) return;
      
      const url = `${API_URL}/visitor/leave`;
      const data = JSON.stringify({ sessionId: sessionId.current });

      // Try sendBeacon first (more reliable for unload)
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        // Fallback to fetch with keepalive
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, []);

  return stats;
}
