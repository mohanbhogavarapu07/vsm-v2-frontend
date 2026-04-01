import { create } from 'zustand';
import { api } from '@/lib/api';

export interface WorkflowStatus {
  id: string;
  name: string;
  category: 'BACKLOG' | 'ACTIVE' | 'REVIEW' | 'VALIDATION' | 'DONE' | 'BLOCKED';
  stage_order: number;
  is_terminal: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status_id: string;
  status_name?: string;
  status_category?: string;
  assignee_id?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  pr_status?: string;
  ci_status?: string;
  ai_signals?: string[];
  ai_confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface AIDecision {
  id: string;
  task_id: string;
  task_title?: string;
  decision: string;
  confidence: number;
  reason: string;
  signals_used: string[];
  status: 'EXECUTED' | 'PENDING_APPROVAL' | 'REJECTED';
  created_at: string;
}

interface WorkflowState {
  statuses: WorkflowStatus[];
  tasks: Task[];
  aiDecisions: AIDecision[];
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;

  fetchWorkflows: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchAIDecisions: () => Promise<void>;
  setSelectedTask: (id: string | null) => void;
  updateTaskStatus: (taskId: string, newStatusId: string) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  statuses: [],
  tasks: [],
  aiDecisions: [],
  loading: false,
  error: null,
  selectedTaskId: null,

  fetchWorkflows: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getWorkflows();
      set({ statuses: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getTasks();
      set({ tasks: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchAIDecisions: async () => {
    try {
      const data = await api.getAIDecisions();
      set({ aiDecisions: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  updateTaskStatus: async (taskId, newStatusId) => {
    try {
      await api.updateTask(taskId, { status_id: newStatusId });
      // Optimistically update
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status_id: newStatusId } : t
        ),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },
}));
