import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Permission {
  id: string;
  key: string;
  label: string;
  description?: string;
}

export interface Role {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  permissions: string[];
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

// Predefined permission options the Scrum can choose from
export const PREDEFINED_PERMISSIONS: Permission[] = [
  { id: 'read', key: 'read', label: 'Read', description: 'View tasks, boards, and project data' },
  { id: 'edit', key: 'edit', label: 'Edit', description: 'Edit tasks, descriptions, and details' },
  { id: 'create', key: 'create', label: 'Create', description: 'Create new tasks and items' },
  { id: 'delete', key: 'delete', label: 'Delete', description: 'Delete tasks and items' },
  { id: 'manage_team', key: 'manage_team', label: 'Manage Team', description: 'Invite, remove, and manage team members' },
  { id: 'assign_tasks', key: 'assign_tasks', label: 'Assign Tasks', description: 'Assign and reassign tasks to members' },
  { id: 'manage_roles', key: 'manage_roles', label: 'Manage Roles', description: 'Create, edit, and delete roles' },
  { id: 'manage_workflows', key: 'manage_workflows', label: 'Manage Workflows', description: 'Configure workflow statuses and transitions' },
  { id: 'view_analytics', key: 'view_analytics', label: 'View Analytics', description: 'Access project analytics and reports' },
  { id: 'manage_ai', key: 'manage_ai', label: 'Manage AI', description: 'Configure AI decisions and automation' },
  { id: 'approve_ai', key: 'approve_ai', label: 'Approve AI Decisions', description: 'Approve or reject AI-suggested actions' },
  { id: 'admin', key: 'admin', label: 'Full Admin', description: 'Full administrative access to the project' },
];

type SetupStep = 'create' | 'roles' | 'permissions' | 'invite' | 'complete';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  roles: Role[];
  members: TeamMember[];
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
  createRole: (projectId: string, data: { name: string; description?: string; permissions: string[] }) => Promise<Role>;
  updateRole: (projectId: string, roleId: string, data: Partial<Role>) => Promise<void>;
  deleteRole: (projectId: string, roleId: string) => Promise<void>;

  // Members
  fetchMembers: (projectId: string) => Promise<void>;
  inviteMember: (projectId: string, email: string, roleId: string) => Promise<void>;
  updateMemberRole: (projectId: string, memberId: string, roleId: string) => Promise<void>;
  removeMember: (projectId: string, memberId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  roles: [],
  members: [],
  loading: false,
  error: null,
  setupStep: 'create',

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
}));
