export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  content: string;
  url: string;
  type: string;
  targetId: number;
  nb: number;
  lastUpdate: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
}
