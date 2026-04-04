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
  team_id: string;
  name: string;
  access_level: AccessLevel;
  permission_codes: string[];
  created_at?: string;
  description?: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role_id: string;
  role_name?: string;
  email: string;
  full_name?: string;
  status?: 'ACTIVE' | 'INVITED' | 'DEACTIVATED';
}

export interface WorkflowStage {
  id: string;
  name: string;
  stage_order: number;
  is_terminal: boolean;
  category?: 'BACKLOG' | 'ACTIVE' | 'REVIEW' | 'VALIDATION' | 'DONE' | 'BLOCKED';
}

export interface Project {
  id: string;
  name: string;
  setupComplete?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Team {
  id: string;
  projectId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

type SetupStep = 'roles' | 'workflow' | 'teams' | 'complete';

interface ProjectState {
  projects: Project[];
  teams: Team[];
  currentProject: Project | null;
  currentTeamId: string | null;
  roles: Role[];
  members: TeamMember[];
  workflowStages: WorkflowStage[];
  permissions: string[];
  loading: boolean;
  error: string | null;

  // Setup wizard
  setupStep: SetupStep;
  setSetupStep: (step: SetupStep) => void;

  // Projects
  fetchProjects: () => Promise<void>;
  fetchPermissions: (teamId: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentTeamId: (teamId: string | null) => void;
  createProject: (data: { name: string }) => Promise<Project>;
  ensureDefaultTeam: (projectId: string) => Promise<string>;
  completeProjectSetup: (projectId: string) => Promise<void>;

  // Teams
  fetchTeams: (projectId: string) => Promise<void>;
  createTeam: (projectId: string, data: { name: string; copyFromTeamId?: string }) => Promise<Team>;
  updateTeamName: (teamId: string, name: string) => Promise<void>;

  // Roles
  fetchRoles: (projectId: string) => Promise<void>;
  createRole: (projectId: string, data: { name: string; description?: string; access_level: AccessLevel }) => Promise<Role>;
  updateRole: (projectId: string, roleId: string, data: Partial<Pick<Role, 'name' | 'access_level'>>) => Promise<void>;
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

const PERMISSIONS = {
  READ_TASK: 'READ_TASK',
  CREATE_TASK: 'CREATE_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  DELETE_TASK: 'DELETE_TASK',
  MANAGE_TEAM: 'MANAGE_TEAM',
  MANAGE_ROLES: 'MANAGE_ROLES',
  ASSIGN_TASKS: 'ASSIGN_TASKS',
} as const;

function permissionCodesForAccess(level: AccessLevel): string[] {
  if (level === 'HIGH') {
    return Object.values(PERMISSIONS);
  }
  if (level === 'MEDIUM') {
    return [
      PERMISSIONS.READ_TASK,
      PERMISSIONS.CREATE_TASK,
      PERMISSIONS.UPDATE_TASK,
      PERMISSIONS.ASSIGN_TASKS,
    ];
  }
  return [PERMISSIONS.READ_TASK];
}

function inferAccessLevel(permission_codes: string[]): AccessLevel {
  const set = new Set(permission_codes);
  const all = Object.values(PERMISSIONS).every((p) => set.has(p));
  if (all) return 'HIGH';
  const medium = [PERMISSIONS.CREATE_TASK, PERMISSIONS.UPDATE_TASK].every((p) => set.has(p));
  return medium ? 'MEDIUM' : 'LOW';
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  teams: [],
  currentProject: null,
  currentTeamId: null,
  roles: [],
  members: [],
  workflowStages: [],
  permissions: [],
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

  fetchPermissions: async (teamId) => {
    try {
      const data = await api.myPermissions(teamId);
      set({ permissions: data.permissions || [] });
    } catch (e) {
      console.error('Failed to fetch permissions', e);
      set({ permissions: [] });
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project, currentTeamId: null, permissions: [], teams: [] });
  },

  setCurrentTeamId: (teamId) => {
    set({ currentTeamId: teamId });
  },

  createProject: async (data) => {
    set({ loading: true, error: null });
    try {
      const project = await api.createProject(data);
      const teamId = await get().ensureDefaultTeam(project.id);
      set((state) => ({
        projects: [...state.projects, project],
        currentProject: project,
        currentTeamId: teamId,
        loading: false,
        setupStep: 'roles',
      }));
      return project;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  ensureDefaultTeam: async (projectId: string) => {
    const teams = await api.listTeams(projectId);
    const teamId = teams?.length ? String(teams[0].id) : null;
    
    if (teamId) {
      await get().fetchPermissions(teamId);
      return teamId;
    }
    
    const created = await api.createTeam(projectId, { name: 'Initial Team' });
    const newTeamId = String(created.id);
    await get().fetchPermissions(newTeamId);
    return newTeamId;
  },

  completeProjectSetup: async (projectId: string) => {
    try {
      await api.completeProjectSetup(projectId);
      set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId ? { ...p, setupComplete: true } : p
        ),
        currentProject: state.currentProject?.id === projectId 
          ? { ...state.currentProject, setupComplete: true } 
          : state.currentProject
      }));
    } catch (e) {
      console.error('Failed to complete project setup', e);
    }
  },

  fetchTeams: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.listTeams(projectId);
      set({
        teams: data.map((t: any) => ({ ...t, id: String(t.id), projectId: String(t.projectId) })),
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createTeam: async (projectId: string, data: { name: string; copyFromTeamId?: string }) => {
    set({ loading: true, error: null });
    try {
      const payload: any = { name: data.name };
      if (data.copyFromTeamId) {
         payload.copy_from_team_id = Number(data.copyFromTeamId);
      }
      const created = await api.createTeam(projectId, payload);
      const team: Team = { ...created, id: String(created.id), projectId: String(created.projectId) };
      set((state) => ({ teams: [...state.teams, team], loading: false }));
      return team;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateTeamName: async (teamId: string, name: string) => {
    try {
      await api.updateTeam(teamId, { name });
      set((state) => ({
        teams: state.teams.map((t) => (t.id === teamId ? { ...t, name } : t)),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchRoles: async (projectId) => {
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      const data = await api.listRoles(teamId);
      set({
        roles: data.map((r: any) => ({
          id: String(r.id),
          team_id: String(r.teamId),
          name: r.name,
          permission_codes: r.permission_codes || [],
          access_level: inferAccessLevel(r.permission_codes || []),
          created_at: r.createdAt,
        })),
      });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createRole: async (projectId, data) => {
    set({ loading: true, error: null });
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      const payload = {
        name: data.name,
        permission_codes: permissionCodesForAccess(data.access_level),
      };
      const created = await api.createRole(teamId, payload);
      const role: Role = {
        id: String(created.id),
        team_id: String(created.teamId),
        name: created.name,
        permission_codes: created.permission_codes || payload.permission_codes,
        access_level: data.access_level,
        description: data.description,
        created_at: created.createdAt,
      };
      set((state) => ({ roles: [...state.roles, role], loading: false }));
      return role;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateRole: async (projectId, roleId, data) => {
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      const patch: any = {};
      if (data.name !== undefined) patch.name = data.name;
      if (data.access_level !== undefined) patch.permission_codes = permissionCodesForAccess(data.access_level);
      await api.updateRole(teamId, roleId, patch);
      set((state) => ({
        roles: state.roles.map((r) => (r.id === roleId ? { ...r, ...data } : r)),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deleteRole: async (projectId, roleId) => {
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      await api.deleteRole(teamId, roleId);
      set((state) => ({ roles: state.roles.filter((r) => r.id !== roleId) }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchMembers: async (projectId) => {
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      const data = await api.listMembers(teamId);
      set({
        members: data.map((m: any) => ({
          id: String(m.id),
          team_id: String(m.team_id ?? m.teamId ?? teamId),
          user_id: String(m.user_id ?? m.userId),
          role_id: String(m.role_id ?? m.roleId),
          role_name: m.role_name ?? m.roleName,
          email: m.email,
          full_name: m.name,
          status: 'ACTIVE',
        })),
      });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  inviteMember: async (projectId, email, roleId) => {
    set({ loading: true, error: null });
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      await api.inviteMember(teamId, { email, name: email.split('@')[0] || email, role_id: roleId });
      await get().fetchMembers(projectId);
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateMemberRole: async (projectId, memberId, roleId) => {
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      await api.updateMemberRole(teamId, memberId, { role_id: roleId });
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
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      await api.removeMember(teamId, memberId);
      set((state) => ({ members: state.members.filter((m) => m.id !== memberId) }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchWorkflowStages: async (projectId) => {
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      const data = await api.listStatuses(teamId);
      set({
        workflowStages: data.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          category: s.category,
          stage_order: s.stageOrder,
          is_terminal: s.isTerminal,
        })),
      });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createWorkflowStage: async (projectId, data) => {
    set({ loading: true, error: null });
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      const created = await api.createStatus(teamId, {
        name: data.name,
        category: data.is_terminal ? 'DONE' : 'ACTIVE',
        stage_order: data.stage_order,
        is_terminal: !!data.is_terminal,
      });
      const stage: WorkflowStage = {
        id: String(created.id),
        name: created.name,
        category: created.category,
        stage_order: created.stageOrder,
        is_terminal: created.isTerminal,
      };
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
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      await api.updateStatus(teamId, stageId, data);
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
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      await api.deleteStatus(teamId, stageId);
      set((state) => ({ workflowStages: state.workflowStages.filter((s) => s.id !== stageId) }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  reorderWorkflowStages: async (projectId, stages) => {
    try {
      const teamId = get().currentTeamId || (await get().ensureDefaultTeam(projectId));
      set({ currentTeamId: teamId });
      
      // Update stages in parallel
      await Promise.all(stages.map((update) => 
        api.updateStatus(teamId, update.id, { stage_order: update.stage_order })
      ));

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
