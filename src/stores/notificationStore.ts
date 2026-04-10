import { create } from 'zustand';
import { api } from '@/lib/api';

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
  markAsRead: (id: string, teamId?: string) => Promise<void>;
  markAllRead: () => void;
  clearAll: () => void;
  fetchNotifications: (teamId: string) => Promise<void>;
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

  markAsRead: async (id, teamId) => {
    if (teamId && !id.startsWith('notif-')) {
      try { await api.markNotificationRead(teamId, id); } catch {}
    }
    set((state) => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - (state.notifications.find(n => n.id === id && !n.read) ? 1 : 0)),
    }));
  },

  markAllRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
  
  fetchNotifications: async (teamId) => {
    try {
      const data = await api.getNotifications(teamId);
      const mapped = data.map((n: any) => ({
        id: String(n.id),
        type: n.type === 'FLAG_SCOPE_CREEP' || n.type === 'FLAG_ASSIGNEE_MISMATCH' || n.type === 'BLOCK' ? 'blocker' : 'system',
        title: n.title,
        message: n.message,
        taskId: n.taskId,
        severity: n.type === 'BLOCK' ? 'critical' : n.type.includes('FLAG') ? 'warning' : 'info',
        read: n.isRead,
        createdAt: n.createdAt
      }));
      set({ notifications: mapped, unreadCount: mapped.filter((n: any) => !n.read).length });
    } catch {}
  }
}));
