import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Notification {
  id: string;
  type: 'ai_decision' | 'blocker' | 'task_update' | 'system' | 'UNLINKED_CONTRIBUTION' | 'task_added' | 'sprint_start' | 'task_done';
  title: string;
  message: string;
  taskId?: number | string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  isBlocker?: boolean;
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
  resolveBlocker: (teamId: string, blockerId: string) => Promise<void>;
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
      const [notifsData, blockersData] = await Promise.all([
        api.getNotifications(teamId),
        api.getBlockers(teamId)
      ]);

      const blockersMapped = blockersData.map((b: any) => ({
        id: String(b.id),
        type: b.type,
        title: b.title,
        message: b.description,
        taskId: b.taskId,
        severity: 'critical' as const,
        read: false, // Blockers are unhandled if in this list
        isBlocker: true,
        createdAt: b.createdAt
      }));

      const notifsMapped = notifsData.map((n: any) => ({
        id: String(n.id),
        type: 'system',
        title: n.title,
        message: n.message,
        taskId: n.taskId,
        severity: 'info' as const,
        read: n.isRead,
        isBlocker: false,
        createdAt: n.createdAt
      }));

      const merged = [...blockersMapped, ...notifsMapped].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      set({ 
        notifications: merged, 
        unreadCount: merged.filter((n: any) => !n.read && !n.isBlocker).length + blockersMapped.length 
      });
    } catch (err) {
      console.error('Failed to fetch notifications/blockers', err);
    }
  },

  resolveBlocker: async (teamId, blockerId) => {
    try {
      await api.resolveBlocker(teamId, blockerId);
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== blockerId),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (err) {
      console.error('Failed to resolve blocker', err);
    }
  }
}));
