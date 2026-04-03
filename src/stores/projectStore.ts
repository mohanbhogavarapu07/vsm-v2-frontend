import { create } from 'zustand';
import { api } from '@/lib/api';

export type AccessLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export const ACCESS_LEVELS: { value: AccessLevel; label: string; description: string; color: string }[] = [
  { value: 'HIGH', label: 'Admin', description: 'Full control — create, delete, update everything, manage team & AI', color: 'text-destructive' },
  { value: 'MEDIUM', label: 'Contributor', description: 'Modify tasks, review, update progress, assign tasks', color: 'text-warning' },
  { value: 'LOW', label: 'Viewer', description: 'Read-only access to tasks, boards, and project data', color: 'text-muted-foreground' },
];

export interface Role {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  access_level: AccessLevel;
  created_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  project_id: string;
  role_id: string;
  role_name?: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  status: 'ACTIVE' | 'INVITED' | 'DEACTIVATED';
  joined_at?: string;
}

export interface WorkflowStage {
  id: string;
  name: string;
  stage_order: number;
  is_terminal: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  key?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  setup_complete: boolean;
}

type SetupStep = 'roles' | 'workflow' | 'invite' | 'complete';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  roles: Role[];
  members: TeamMember[];
  workflowStages: WorkflowStage[];
  loading: boolean;
  error: string | null;

  // Setup wizard
  setupStep: SetupStep;
  setSetupStep: (step: SetupStep) => void;

  // Projects
  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  createProject: (data: { name: string; description?: string; key?: string }) => Promise<Project>;

  // Roles
  fetchRoles: (projectId: string) => Promise<void>;
  createRole: (projectId: string, data: { name: string; description?: string; access_level: AccessLevel }) => Promise<Role>;
  updateRole: (projectId: string, roleId: string, data: Partial<Role>) => Promise<void>;
  deleteRole: (projectId: string, roleId: string) => Promise<void>;

  // Members
  fetchMembers: (projectId: string) => Promise<void>;
  inviteMember: (projectId: string, email: string, roleId: string) => Promise<void>;
  updateMemberRole: (projectId: string, memberId: string, roleId: string) => Promise<void>;
  removeMember: (projectId: string, memberId: string) => Promise<void>;

  // Workflow stages
  fetchWorkflowStages: (projectId: string) => Promise<void>;
  createWorkflowStage: (projectId: string, data: { name: string; stage_order: number; is_terminal?: boolean }) => Promise<WorkflowStage>;
  updateWorkflowStage: (projectId: string, stageId: string, data: Partial<WorkflowStage>) => Promise<void>;
  deleteWorkflowStage: (projectId: string, stageId: string) => Promise<void>;
  reorderWorkflowStages: (projectId: string, stages: { id: string; stage_order: number }[]) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  roles: [],
  members: [],
  workflowStages: [],
  loading: false,
  error: null,
  setupStep: 'roles',

  setSetupStep: (step) => set({ setupStep: step }),

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getProjects();
      set({ projects: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  createProject: async (data) => {
    set({ loading: true, error: null });
    try {
      const project = await api.createProject(data);
      set((state) => ({
        projects: [...state.projects, project],
        currentProject: project,
        loading: false,
        setupStep: 'roles',
      }));
      return project;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  fetchRoles: async (projectId) => {
    try {
      const data = await api.getProjectRoles(projectId);
      set({ roles: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createRole: async (projectId, data) => {
    set({ loading: true, error: null });
    try {
      const role = await api.createRole(projectId, data);
      set((state) => ({ roles: [...state.roles, role], loading: false }));
      return role;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateRole: async (projectId, roleId, data) => {
    try {
      await api.updateRole(projectId, roleId, data);
      set((state) => ({
        roles: state.roles.map((r) => (r.id === roleId ? { ...r, ...data } : r)),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deleteRole: async (projectId, roleId) => {
    try {
      await api.deleteRole(projectId, roleId);
      set((state) => ({ roles: state.roles.filter((r) => r.id !== roleId) }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchMembers: async (projectId) => {
    try {
      const data = await api.getProjectMembers(projectId);
      set({ members: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  inviteMember: async (projectId, email, roleId) => {
    set({ loading: true, error: null });
    try {
      const member = await api.inviteMember(projectId, { email, role_id: roleId });
      set((state) => ({ members: [...state.members, member], loading: false }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateMemberRole: async (projectId, memberId, roleId) => {
    try {
      await api.updateMemberRole(projectId, memberId, roleId);
      set((state) => ({
        members: state.members.map((m) =>
          m.id === memberId ? { ...m, role_id: roleId } : m
        ),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  removeMember: async (projectId, memberId) => {
    try {
      await api.removeMember(projectId, memberId);
      set((state) => ({ members: state.members.filter((m) => m.id !== memberId) }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchWorkflowStages: async (projectId) => {
    try {
      const data = await api.getProjectWorkflowStages(projectId);
      set({ workflowStages: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createWorkflowStage: async (projectId, data) => {
    set({ loading: true, error: null });
    try {
      const stage = await api.createWorkflowStage(projectId, data);
      set((state) => ({
        workflowStages: [...state.workflowStages, stage].sort((a, b) => a.stage_order - b.stage_order),
        loading: false,
      }));
      return stage;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateWorkflowStage: async (projectId, stageId, data) => {
    try {
      await api.updateWorkflowStage(projectId, stageId, data);
      set((state) => ({
        workflowStages: state.workflowStages
          .map((s) => (s.id === stageId ? { ...s, ...data } : s))
          .sort((a, b) => a.stage_order - b.stage_order),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deleteWorkflowStage: async (projectId, stageId) => {
    try {
      await api.deleteWorkflowStage(projectId, stageId);
      set((state) => ({ workflowStages: state.workflowStages.filter((s) => s.id !== stageId) }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  reorderWorkflowStages: async (projectId, stages) => {
    try {
      await api.reorderWorkflowStages(projectId, stages);
      set((state) => ({
        workflowStages: state.workflowStages
          .map((s) => {
            const update = stages.find((u) => u.id === s.id);
            return update ? { ...s, stage_order: update.stage_order } : s;
          })
          .sort((a, b) => a.stage_order - b.stage_order),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },
}));
