import { create } from 'zustand';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface WorkflowStage {
  id: number;
  projectId: number;
  name: string;
  systemCategory: 'ACTIVE' | 'REVIEW' | 'VALIDATION' | 'DONE' | 'BLOCKED' | 'BACKLOG';
  intentTag?: string;
  positionOrder: number;
  scopeType: 'PROJECT' | 'TEAM';
  isBlocking: boolean;
  requiresApprovalToExit: boolean;
  slaDurationMinutes?: number;
}

export interface WorkflowTransition {
  id: number;
  projectId: number;
  fromStageId: number;
  toStageId: number;
  directionType: 'FORWARD' | 'BACKWARD' | 'PARALLEL';
  triggerType: 'GITHUB_EVENT' | 'MANUAL' | 'TIMER' | 'CONDITION_MET';
  githubEventType?: string;
  requiredRole?: string;
  conditions: any[];
  postActions: any[];
  isActive: boolean;
  fromStageName?: string;
  toStageName?: string;
}

export interface AIDecision {
  id: number;
  taskId: number;
  taskTitle?: string;
  fromStageId?: number;
  toStageId?: number;
  transitionId?: number;
  confidenceScore: number;
  reasoning: string;
  correlationId: string;
  status: 'APPLIED' | 'BLOCKED' | 'NO_TRANSITION' | 'FUZZY_LINK' | 'PENDING_CONFIRMATION' | 'PENDING_APPROVAL';
  triggeredByEvent?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  teamId: number;
  sprint_id: number | null;
  status_id: number | null;
  currentStageId: number | null;
  status_name?: string;
  status_category?: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  order: number;
  assignee_id?: number | null;
  assignee_name?: string;
  createdAt: string;
  updatedAt: string;
  // AI/Dev signal fields (may come from backend)
  pr_status?: string;
  ci_status?: string;
  ai_signals?: string[];
  ai_confidence?: number;
}

export interface Sprint {
  id: string;
  teamId: number;
  name: string;
  goal?: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  task_counts: {
    total: number;
    todo: number;
    in_progress: number;
    done: number;
  };
}

interface WorkflowState {
  // New Graph-based Workflow Engine
  stages: WorkflowStage[];
  transitions: WorkflowTransition[];
  readiness: 'DRAFT' | 'INCOMPLETE' | 'ACTIVE';
  
  // Legacy/Kanban Board State
  statuses: WorkflowStage[]; // Alias for stages to support older components
  tasks: Task[];
  sprints: Sprint[];
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;
  currentTeamId: string | null;
  aiDecisions: AIDecision[];
  isTaskEditMode: boolean;
  
  selectedFromStageId: number | null;
  selectedToStageId: number | null;
  
  // New Actions
  setWorkflowGraph: (graph: { stages: WorkflowStage[], transitions: WorkflowTransition[], readiness: string }) => void;
  addStage: (stage: WorkflowStage) => void;
  addTransition: (transition: WorkflowTransition) => void;
  setSelectedFromStage: (id: number | null) => void;
  setSelectedToStage: (id: number | null) => void;
  setAIDecisions: (decisions: AIDecision[]) => void;
  appendAIDecision: (decision: AIDecision) => void;

  // Kanban/Board Actions
  setTeamId: (teamId: string | null) => void;
  fetchWorkflows: (projectId: string) => Promise<void>;
  fetchTasks: (limit?: number, offset?: number) => Promise<void>;
  fetchSprints: () => Promise<void>;
  fetchAIDecisions: () => Promise<void>;
  setSelectedTask: (taskId: string | null) => void;
  setIsTaskEditMode: (mode: boolean) => void;
  updateTaskStatus: (taskId: string, newStatusId: string) => Promise<void>;
  updateTaskPriority: (taskId: string, priority: Task['priority']) => Promise<void>;
  updateTaskAssignee: (taskId: string, assigneeId: string | null) => Promise<void>;

  // Sprint Management
  createSprint: (name: string, goal?: string, startDate?: string, endDate?: string) => Promise<any>;
  updateSprint: (sprintId: string, data: Partial<{ name: string; goal: string; startDate: string; endDate: string }>) => Promise<void>;
  deleteSprint: (sprintId: string) => Promise<void>;
  startSprint: (sprintId: string, data: { goal?: string; startDate?: string; endDate?: string }) => Promise<void>;
  completeSprint: (sprintId: string, rolloverSprintId?: number | string | null) => Promise<void>;

  // Task Management
  createTask: (title: string, statusId?: string | number, sprintId?: string | number) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTaskOrder: (taskId: string, sprintId: string | number | null, order: number) => Promise<void>;
  updateTaskSprint: (taskId: string, sprintId: string | number | null) => Promise<void>;
  updateTaskDetails: (taskId: string, data: Partial<{ title: string; description: string; priority: string; assignee_id: number | null }>) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  stages: [],
  transitions: [],
  readiness: 'DRAFT',
  
  statuses: [],
  tasks: [],
  sprints: [],
  loading: false,
  error: null,
  selectedTaskId: null,
  currentTeamId: null,
  aiDecisions: [],
  isTaskEditMode: false,
  selectedFromStageId: null,
  selectedToStageId: null,
  
  setWorkflowGraph: (graph) => set({ 
    stages: graph.stages, 
    transitions: graph.transitions, 
    readiness: graph.readiness as any,
    statuses: graph.stages // Update statuses alias too
  }),
  
  addStage: (stage) => set((state) => ({ 
    stages: [...state.stages, stage],
    statuses: [...state.stages, stage]
  })),
  
  addTransition: (transition) => set((state) => ({ transitions: [...state.transitions, transition] })),
  
  setSelectedFromStage: (id) => set({ selectedFromStageId: id }),
  
  setSelectedToStage: (id) => set({ selectedToStageId: id }),
  
  setAIDecisions: (decisions) => set({ aiDecisions: decisions }),
  
  appendAIDecision: (decision) => set((state) => ({ aiDecisions: [decision, ...state.aiDecisions] })),

  // Kanban Implementations
  setTeamId: (teamId) => {
    set({ currentTeamId: teamId, tasks: [], sprints: [], aiDecisions: [] });
  },

  fetchWorkflows: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.listStatuses(projectId);
      const stages = data.map((s: any) => ({
        id: s.id,
        projectId: s.projectId,
        name: s.name,
        systemCategory: s.category,
        intentTag: s.intentTag,
        positionOrder: s.stageOrder,
        isBlocking: s.isTerminal,
      })) as any[];
      set({ stages, statuses: stages, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchTasks: async (limit, offset) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    set({ loading: true });
    try {
      const tasks = await api.listTasks(teamId, limit, offset);
      set({ tasks, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchSprints: async () => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      const sprints = await api.listSprints(teamId);
      set({ sprints });
    } catch (e: any) {
      console.error('Failed to fetch sprints', e);
    }
  },

  fetchAIDecisions: async () => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      const data = await api.getEventLog(teamId);
      set({ aiDecisions: data as any });
    } catch (e: any) {
      console.error('Failed to fetch AI decisions', e);
      set({ aiDecisions: [] });
    }
  },

  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),

  updateTaskStatus: async (taskId, newStatusId) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      await api.manualTransition(taskId, teamId, { new_status_id: Number(newStatusId) });
      const newStage = get().stages.find(s => s.id === Number(newStatusId));
      const tasks = get().tasks.map(t => 
        String(t.id) === String(taskId) ? { 
          ...t, 
          status_id: Number(newStatusId),
          currentStageId: Number(newStatusId),
          status_name: newStage?.name || t.status_name,
          status_category: newStage?.systemCategory || t.status_category
        } : t
      );
      set({ tasks });
      toast.success('Task status updated');
    } catch (e: any) {
      toast.error('Failed to update status', { description: e.message });
    }
  },

  // Sprint Management
  createSprint: async (name, goal, startDate, endDate) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      const sprint = await api.createSprint(teamId, { name, goal, startDate, endDate });
      set((state) => ({ sprints: [...state.sprints, sprint] }));
      toast.success('Sprint created');
      return sprint;
    } catch (e: any) {
      toast.error('Failed to create sprint', { description: e.message });
    }
  },

  updateSprint: async (sprintId, data) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      const updated = await api.updateSprint(teamId, sprintId, data);
      set((state) => ({
        sprints: state.sprints.map((s) => (s.id === sprintId ? { ...s, ...updated } : s)),
      }));
      toast.success('Sprint updated');
    } catch (e: any) {
      toast.error('Failed to update sprint', { description: e.message });
    }
  },

  deleteSprint: async (sprintId) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      await api.deleteSprint(teamId, sprintId);
      set((state) => ({
        sprints: state.sprints.filter((s) => s.id !== sprintId),
        tasks: state.tasks.map((t) => (t.sprint_id === Number(sprintId) ? { ...t, sprint_id: null } : t)),
      }));
      toast.success('Sprint deleted');
    } catch (e: any) {
      toast.error('Failed to delete sprint', { description: e.message });
    }
  },

  startSprint: async (sprintId, data) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      const updated = await api.startSprint(teamId, sprintId, data);
      set((state) => ({
        sprints: state.sprints.map((s) => (s.id === sprintId ? { ...s, ...updated } : s)),
      }));
      toast.success('Sprint started');
    } catch (e: any) {
      toast.error('Failed to start sprint', { description: e.message });
    }
  },

  completeSprint: async (sprintId, rolloverSprintId) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      const rolloverId = rolloverSprintId === null ? null : Number(rolloverSprintId);
      await api.completeSprint(teamId, sprintId, { rollover_sprint_id: rolloverId });
      // Full refresh for consistency as tasks move between sprints/backlog
      await get().fetchSprints();
      await get().fetchTasks();
      toast.success('Sprint completed');
    } catch (e: any) {
      toast.error('Failed to complete sprint', { description: e.message });
    }
  },

  // Task Management
  createTask: async (title, statusId, sprintId) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      const data = {
        title,
        current_status_id: statusId ? Number(statusId) : null,
        sprint_id: sprintId ? Number(sprintId) : null
      };
      const task = await api.createTask(teamId, data);
      set((state) => ({ tasks: [...state.tasks, task] }));
      toast.success('Task created');
    } catch (e: any) {
      toast.error('Failed to create task', { description: e.message });
    }
  },

  deleteTask: async (taskId) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      await api.deleteTask(taskId, teamId);
      set((state) => ({
        tasks: state.tasks.filter((t) => String(t.id) !== String(taskId)),
      }));
      toast.success('Task deleted');
    } catch (e: any) {
      toast.error('Failed to delete task', { description: e.message });
    }
  },

  updateTaskOrder: async (taskId, sprintId, order) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      const sid = sprintId === null ? null : Number(sprintId);
      await api.updateTask(taskId, teamId, { sprint_id: sid, order });
      set((state) => ({
        tasks: state.tasks.map((t) => (String(t.id) === String(taskId) ? { ...t, sprint_id: sid, order } : t)),
      }));
    } catch (e: any) {
      toast.error('Failed to update task order', { description: e.message });
      // Revert local state if needed (refetch)
      await get().fetchTasks();
    }
  },

  updateTaskSprint: async (taskId, sprintId) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      if (sprintId === null) {
        await api.removeTaskFromSprint(teamId, 'any', taskId); // In existing API 'any' usually works or we use updateTask
      } else {
        await api.assignTaskToSprint(teamId, String(sprintId), taskId);
      }
      const sid = sprintId === null ? null : Number(sprintId);
      set((state) => ({
        tasks: state.tasks.map((t) => (String(t.id) === String(taskId) ? { ...t, sprint_id: sid } : t)),
      }));
    } catch (e: any) {
      toast.error('Failed to move task', { description: e.message });
    }
  },

  updateTaskDetails: async (taskId, data) => {
    const teamId = get().currentTeamId;
    if (!teamId) return;
    try {
      const updated = await api.updateTask(taskId, teamId, data as any);
      set((state) => ({
        tasks: state.tasks.map((t) => (String(t.id) === String(taskId) ? { ...t, ...updated } : t)),
      }));
      toast.success('Task updated');
    } catch (e: any) {
      toast.error('Failed to update task', { description: e.message });
    }
  },
}));
