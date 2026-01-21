import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, []);

  const joinWebhook = (token: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-webhook', token);
    }
  };

  const leaveWebhook = (token: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-webhook', token);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinWebhook,
    leaveWebhook,
  };
}
