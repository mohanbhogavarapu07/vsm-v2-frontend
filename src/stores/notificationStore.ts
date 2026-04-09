import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'ai_decision' | 'blocker' | 'task_update' | 'system';
  title: string;
  message: string;
  taskId?: number | string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  setOpen: (open) => set({ isOpen: open }),

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50), // Keep max 50
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadCount: Math.max(0, state.unreadCount - (state.notifications.find(n => n.id === id && !n.read) ? 1 : 0)),
  })),

  markAllRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
