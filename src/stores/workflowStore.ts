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
  sprint_id?: string;
  status_id?: string;
  status_name?: string;
  status_category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  pr_status?: string;
  ci_status?: string;
  ai_signals?: string[];
  ai_confidence?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SprintTaskCounts {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  task_counts: SprintTaskCounts;
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
  sprints: Sprint[];
  aiDecisions: AIDecision[];
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;
  teamId: string | null;

  // Core fetches
  fetchWorkflows: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchSprints: () => Promise<void>;
  fetchAIDecisions: () => Promise<void>;

  // Task actions
  setSelectedTask: (id: string | null) => void;
  updateTaskStatus: (taskId: string, newStatusId: string) => Promise<void>;
  updateTaskSprint: (taskId: string, sprintId: string | null) => Promise<void>;
  createTask: (title: string, statusId?: string, sprintId?: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Sprint CRUD
  createSprint: (name: string, goal?: string) => Promise<Sprint | null>;

  // Sprint lifecycle (Jira-style)
  startSprint: (sprintId: string, data: { goal?: string; startDate?: string; endDate?: string }) => Promise<void>;
  completeSprint: (sprintId: string, rolloverSprintId?: string | null) => Promise<void>;

  // Team
  setTeamId: (teamId: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  statuses: [],
  tasks: [],
  sprints: [],
  aiDecisions: [],
  loading: false,
  error: null,
  selectedTaskId: null,
  teamId: null,

  setTeamId: (teamId) => set({ teamId }),

  // ─────────────────────────────────────────────────────────────────────────
  // FETCHES
  // ─────────────────────────────────────────────────────────────────────────

  fetchWorkflows: async () => {
    const teamId = get().teamId;
    if (!teamId) {
      set({ error: 'No team selected', statuses: [] });
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await api.listStatuses(teamId);
      const statuses: WorkflowStatus[] = (data || []).map((s: any) => ({
        id: String(s.id),
        name: s.name,
        category: s.category,
        stage_order: s.stageOrder,
        is_terminal: s.isTerminal,
      }));
      set({ statuses, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchTasks: async () => {
    const teamId = get().teamId;
    if (!teamId) {
      set({ error: 'No team selected', tasks: [] });
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await api.listTasks(teamId);
      const tasks: Task[] = (data || []).map((t: any) => ({
        id: String(t.id),
        title: t.title,
        description: t.description ?? undefined,
        sprint_id: t.sprintId ? String(t.sprintId) : undefined,
        status_id: t.currentStatusId ? String(t.currentStatusId) : undefined,
        status_name: t.currentStatus?.name,
        status_category: t.currentStatus?.category,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      }));
      set({ tasks, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchSprints: async () => {
    const teamId = get().teamId;
    if (!teamId) return;
    try {
      const data = await api.listSprints(teamId);
      const sprints: Sprint[] = (data || []).map((s: any) => ({
        id: String(s.id),
        name: s.name,
        goal: s.goal,
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        task_counts: s.task_counts ?? { total: 0, todo: 0, in_progress: 0, done: 0 },
      }));
      set({ sprints });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchAIDecisions: async () => {
    try {
      const teamId = get().teamId;
      if (!teamId) {
        set({ aiDecisions: [] });
        return;
      }
      const tasks = get().tasks;
      if (!tasks.length) {
        set({ aiDecisions: [] });
        return;
      }
      const rows = await Promise.all(
        tasks.map(async (t) => {
          try {
            const decisions = await api.getTaskDecisions(t.id, teamId);
            return (decisions || []).map((d: any) => ({
              id: String(d.id),
              task_id: String(d.taskId),
              task_title: t.title,
              decision: d.actionTaken,
              confidence: d.confidenceScore,
              reason: d.reason,
              signals_used: Object.keys(d.inputSignals || {}),
              status: 'EXECUTED' as const,
              created_at: d.createdAt,
            }));
          } catch {
            return [];
          }
        })
      );
      set({ aiDecisions: rows.flat() });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TASK ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  updateTaskStatus: async (taskId, newStatusId) => {
    try {
      const teamId = get().teamId;
      if (!teamId) throw new Error('No team selected');
      await api.manualTransition(taskId, teamId, { new_status_id: Number(newStatusId) });
      // Optimistic update
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status_id: newStatusId } : t
        ),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  updateTaskSprint: async (taskId, sprintId) => {
    try {
      const teamId = get().teamId;
      if (!teamId) throw new Error('No team selected');

      if (sprintId) {
        // Assign to sprint via dedicated endpoint
        await api.assignTaskToSprint(teamId, sprintId, taskId);
      } else {
        // Find current sprint and remove
        const task = get().tasks.find((t) => t.id === taskId);
        if (task?.sprint_id) {
          await api.removeTaskFromSprint(teamId, task.sprint_id, taskId);
        } else {
          // Fallback to generic update
          await api.updateTask(taskId, teamId, { sprint_id: null });
        }
      }

      // Optimistic update
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, sprint_id: sprintId || undefined } : t
        ),
      }));

      // Refresh sprint stats
      await get().fetchSprints();
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createTask: async (title, statusId, sprintId) => {
    try {
      const teamId = get().teamId;
      if (!teamId) throw new Error('No team selected');

      await api.createTask(teamId, {
        title,
        current_status_id: statusId ? Number(statusId) : null,
        sprint_id: sprintId ? Number(sprintId) : null,
      });

      await get().fetchTasks();
      await get().fetchSprints(); // update task counts
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deleteTask: async (taskId) => {
    try {
      const teamId = get().teamId;
      if (!teamId) throw new Error('No team selected');
      await api.deleteTask(taskId, teamId);
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
      await get().fetchSprints();
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SPRINT CRUD
  // ─────────────────────────────────────────────────────────────────────────

  createSprint: async (name, goal) => {
    try {
      const teamId = get().teamId;
      if (!teamId) throw new Error('No team selected');
      const raw = await api.createSprint(teamId, { name, goal });
      const sprint: Sprint = {
        id: String(raw.id),
        name: raw.name,
        goal: raw.goal,
        status: raw.status,
        startDate: raw.startDate,
        endDate: raw.endDate,
        task_counts: { total: 0, todo: 0, in_progress: 0, done: 0 },
      };
      set((state) => ({ sprints: [...state.sprints, sprint] }));
      return sprint;
    } catch (e: any) {
      set({ error: e.message });
      return null;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SPRINT LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  startSprint: async (sprintId, data) => {
    try {
      const teamId = get().teamId;
      if (!teamId) throw new Error('No team selected');
      await api.startSprint(teamId, sprintId, data);
      // Refresh both sprints (status changed) and tasks (may have dates updated)
      await get().fetchSprints();
      await get().fetchTasks();
    } catch (e: any) {
      // Re-throw so the modal can show the error message
      set({ error: e.message });
      throw e;
    }
  },

  completeSprint: async (sprintId, rolloverSprintId) => {
    try {
      const teamId = get().teamId;
      if (!teamId) throw new Error('No team selected');
      await api.completeSprint(teamId, sprintId, {
        rollover_sprint_id: rolloverSprintId ? Number(rolloverSprintId) : null,
      });
      // Refresh everything — tasks may have moved sprints
      await Promise.all([get().fetchSprints(), get().fetchTasks()]);
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },
}));
