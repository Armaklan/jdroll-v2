import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationsApi } from '../api/notifications';
import { NotificationItem } from '../types/notification';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    try {
      setIsLoading(true);
      const res = await notificationsApi.getNotifications();
      setNotifications(res.notifications || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const deleteNotification = async (id: number) => {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await notificationsApi.deleteAllNotifications();
      setNotifications([]);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      setNotifications([]);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      return;
    }

    let isMounted = true;

    fetchNotifications();

    function connectWs() {
      if (!isMounted || !isAuthenticated) return;

      try {
        const wsUrl = notificationsApi.getWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          // Set up heartbeat ping every 25 seconds
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'init') {
              if (Array.isArray(data.notifications)) {
                setNotifications(data.notifications);
              }
            } else if (data.type === 'notification' && data.notification) {
              const newNotif: NotificationItem = data.notification;
              setNotifications((prev) => {
                const index = prev.findIndex((n) => n.id === newNotif.id);
                if (index >= 0) {
                  const updated = [...prev];
                  updated[index] = newNotif;
                  return updated;
                }
                return [newNotif, ...prev];
              });
            } else if (data.type === 'notification_deleted' && typeof data.id === 'number') {
              setNotifications((prev) => prev.filter((n) => n.id !== data.id));
            } else if (data.type === 'notifications_cleared') {
              setNotifications([]);
            } else if (data.type === 'notifications_update' && Array.isArray(data.notifications)) {
              setNotifications(data.notifications);
            }
          } catch {
            // ignore malformed messages
          }
        };

        ws.onclose = () => {
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }
          if (isMounted && isAuthenticated) {
            reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (isMounted && isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
        }
      }
    }

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, token, user?.id, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: notifications.length,
        isLoading,
        fetchNotifications,
        deleteNotification,
        deleteAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
