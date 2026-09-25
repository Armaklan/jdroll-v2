import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { getToken } from '../api/auth';
import { ChatConnectedUser } from '../types/chat';

interface PresenceContextType {
  onlineUsers: ChatConnectedUser[];
  isConnected: boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

function buildPresenceWebSocketUrl(token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/api/presence/ws?token=${encodeURIComponent(token)}`;
}

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<ChatConnectedUser[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    let reconnectAttempts = 0;

    const connect = () => {
      const token = getToken();
      if (!token) return;

      const ws = new WebSocket(buildPresenceWebSocketUrl(token));
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts = 0;
        if (!cancelled) setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence' && Array.isArray(data.users)) {
            setOnlineUsers(data.users);
          }
        } catch {
          // Message invalide ignoré
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setIsConnected(false);
        // Reconnexion progressive (5s max) tant que l'utilisateur est authentifié
        const delay = Math.min(1000 + reconnectAttempts * 1000, 5000);
        reconnectAttempts += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setOnlineUsers([]);
      setIsConnected(false);
    };
  }, [isAuthenticated, isLoading]);

  return (
    <PresenceContext.Provider value={{ onlineUsers, isConnected }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};
