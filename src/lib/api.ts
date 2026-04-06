const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function getVsmUserId(): string | null {
  // Use ONLY localStorage to ensure we don't bypass authentication via env vars
  return localStorage.getItem('vsm_user_id');
}

function buildQuery(params?: QueryParams): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

async function apiRequest<T>(path: string, options: RequestInit = {}, query?: QueryParams): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string> | undefined),
  };

  // Backend RBAC expects X-User-ID. Configured via env/localStorage.
  const userId = getVsmUserId();
  if (userId) headers['X-User-ID'] = userId;

  const response = await fetch(`${API_BASE}${path}${buildQuery(query)}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  // ── Projects ───────────────────────────────────────────────────────────────
  getProjects: () => apiRequest<any[]>('/projects'),
  getProject: (projectId: string) => apiRequest<any>(`/projects/${projectId}`),
  createProject: (data: { name: string }) =>
    apiRequest<any>('/projects', { method: 'POST', body: JSON.stringify({ name: data.name }) }),
  completeProjectSetup: (projectId: string) =>
    apiRequest<any>(`/projects/${projectId}/complete-setup`, { method: 'POST' }),

  // ── Teams ──────────────────────────────────────────────────────────────────
  listTeams: (projectId: string) => apiRequest<any[]>(`/projects/${projectId}/teams`),
  createTeam: (projectId: string, data: { name: string; copy_from_team_id?: number }) =>
    apiRequest<any>(`/projects/${projectId}/teams`, { method: 'POST', body: JSON.stringify(data) }),
  getTeam: (teamId: string) => apiRequest<any>(`/teams/${teamId}`),
  updateTeam: (teamId: string, data: { name: string }) =>
    apiRequest<any>(`/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify(data) }, { team_id: teamId }),

  // ── Roles (team-scoped) ────────────────────────────────────────────────────
  listRoles: (teamId: string) =>
    apiRequest<any[]>(`/teams/${teamId}/roles`, {}, { team_id: teamId }),
  createRole: (teamId: string, data: { name: string; permission_codes: string[] }) =>
    apiRequest<any>(`/teams/${teamId}/roles`, { method: 'POST', body: JSON.stringify(data) }, { team_id: teamId }),
  updateRole: (teamId: string, roleId: string, data: Partial<{ name: string; permission_codes: string[] }>) =>
    apiRequest<any>(`/teams/${teamId}/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(data) }, { team_id: teamId }),
  deleteRole: (teamId: string, roleId: string) =>
    apiRequest<void>(`/teams/${teamId}/roles/${roleId}`, { method: 'DELETE' }, { team_id: teamId }),

  // ── Workflow statuses (team-scoped) ────────────────────────────────────────
  listStatuses: (teamId: string) => apiRequest<any[]>(`/teams/${teamId}/workflow/statuses`, {}, { team_id: teamId }),
  createStatus: (teamId: string, data: { name: string; category: string; stage_order: number; is_terminal?: boolean }) =>
    apiRequest<any>(`/teams/${teamId}/workflow/statuses`, { method: 'POST', body: JSON.stringify(data) }, { team_id: teamId }),
  updateStatus: (teamId: string, statusId: string, data: Partial<{ name: string; category: string; stage_order: number; is_terminal: boolean }>) =>
    apiRequest<any>(`/teams/${teamId}/workflow/statuses/${statusId}`, { method: 'PATCH', body: JSON.stringify(data) }, { team_id: teamId }),
  deleteStatus: (teamId: string, statusId: string) =>
    apiRequest<void>(`/teams/${teamId}/workflow/statuses/${statusId}`, { method: 'DELETE' }, { team_id: teamId }),

  // ── Members / invitations (team-scoped) ────────────────────────────────────
  listMembers: (teamId: string) => apiRequest<any[]>(`/teams/${teamId}/members`, {}, { team_id: teamId }),
  inviteMember: (teamId: string, data: { email: string; name: string; role_id: string }) =>
    apiRequest<any>(`/teams/${teamId}/invitations`, { method: 'POST', body: JSON.stringify(data) }, { team_id: teamId }),
  updateMemberRole: (teamId: string, memberId: string, data: { role_id: string }) =>
    apiRequest<any>(`/teams/${teamId}/members/${memberId}/role`, { method: 'PATCH', body: JSON.stringify(data) }, { team_id: teamId }),
  removeMember: (teamId: string, memberId: string) =>
    apiRequest<void>(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' }, { team_id: teamId }),

  // ── Tasks (team-scoped via query) ──────────────────────────────────────────
  listTasks: (teamId: string, limit = 50, offset = 0) =>
    apiRequest<any[]>('/tasks', {}, { team_id: teamId, limit, offset }),
  createTask: (teamId: string, data: { title: string; description?: string; sprint_id?: number | null; current_status_id?: number | null; assignee_id?: number | null; priority?: string }) =>
    apiRequest<any>('/tasks', { method: 'POST', body: JSON.stringify({ team_id: Number(teamId), ...data }) }, { team_id: teamId }),
  updateTask: (taskId: string, teamId: string, data: { title?: string; description?: string; sprint_id?: number | null; current_status_id?: number | null; assignee_id?: number | null; priority?: string; order?: number }) =>
    apiRequest<any>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }, { team_id: teamId }),
  deleteTask: (taskId: string, teamId: string) =>
    apiRequest<void>(`/tasks/${taskId}`, { method: 'DELETE' }, { team_id: teamId }),
  manualTransition: (taskId: string, teamId: string, data: { new_status_id: number; reason?: string }) =>
    apiRequest<any>(`/tasks/${taskId}/transition`, { method: 'POST', body: JSON.stringify(data) }, { team_id: teamId }),
  getTaskActivity: (taskId: string, teamId: string) =>
    apiRequest<any[]>(`/tasks/${taskId}/activity`, {}, { team_id: teamId }),
  getTaskDecisions: (taskId: string, teamId: string) =>
    apiRequest<any[]>(`/tasks/${taskId}/decisions`, {}, { team_id: teamId }),
  approveDecision: (taskId: string, decisionId: string, teamId: string) =>
    apiRequest<any>(`/tasks/${taskId}/decisions/${decisionId}/approve`, { method: 'POST' }, { team_id: teamId }),
  rejectDecision: (taskId: string, decisionId: string, teamId: string) =>
    apiRequest<any>(`/tasks/${taskId}/decisions/${decisionId}/reject`, { method: 'POST' }, { team_id: teamId }),

  // ── Sprints (team-scoped) ──────────────────────────────────────────────────
  listSprints: (teamId: string) =>
    apiRequest<any[]>(`/teams/${teamId}/sprints/`),
  createSprint: (teamId: string, data: { name: string; goal?: string; startDate?: string; endDate?: string }) =>
    apiRequest<any>(`/teams/${teamId}/sprints/`, { method: 'POST', body: JSON.stringify(data) }),
  updateSprint: (teamId: string, sprintId: string, data: { name?: string; goal?: string; startDate?: string; endDate?: string }) =>
    apiRequest<any>(`/teams/${teamId}/sprints/${sprintId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSprint: (teamId: string, sprintId: string) =>
    apiRequest<void>(`/teams/${teamId}/sprints/${sprintId}`, { method: 'DELETE' }),

  // Sprint lifecycle
  startSprint: (teamId: string, sprintId: string, data: { goal?: string; startDate?: string; endDate?: string }) =>
    apiRequest<any>(`/teams/${teamId}/sprints/${sprintId}/start`, { method: 'POST', body: JSON.stringify(data) }),
  completeSprint: (teamId: string, sprintId: string, data: { rollover_sprint_id?: number | null }) =>
    apiRequest<any>(`/teams/${teamId}/sprints/${sprintId}/complete`, { method: 'POST', body: JSON.stringify(data) }),

  // Sprint tasks
  getSprintTasks: (teamId: string, sprintId: string) =>
    apiRequest<any[]>(`/teams/${teamId}/sprints/${sprintId}/tasks`),
  assignTaskToSprint: (teamId: string, sprintId: string, taskId: string) =>
    apiRequest<any>(`/teams/${teamId}/sprints/${sprintId}/tasks/${taskId}`, { method: 'POST' }),
  removeTaskFromSprint: (teamId: string, sprintId: string, taskId: string) =>
    apiRequest<any>(`/teams/${teamId}/sprints/${sprintId}/tasks/${taskId}`, { method: 'DELETE' }),

  // Backlog
  getBacklogTasks: (teamId: string, limit = 100, offset = 0) =>
    apiRequest<any[]>(`/teams/${teamId}/backlog`, {}, { limit, offset }),

  // ── Event feed ─────────────────────────────────────────────────────────────
  getEventLog: (teamId: string, limit = 100) =>
    apiRequest<any[]>('/tasks/events', {}, { team_id: teamId, limit }),
  sendChatMessage: (message: string, teamId: string) =>
    apiRequest<any>('/webhooks/chat', {
      method: 'POST',
      body: JSON.stringify({
        user_id: Number(getVsmUserId() || 0),
        team_id: Number(teamId),
        message,
        timestamp: String(Math.floor(Date.now() / 1000)),
        platform_message_id: `web-${Date.now()}`,
      }),
    }),

  // ── Permissions self-check ────────────────────────────────────────────────
  myPermissions: (teamId: string) => apiRequest<{ permissions: string[] }>('/me/permissions', undefined, { team_id: teamId }),

  // ── GitHub App Integration ────────────────────────────────────────────────
  getGitHubInstallUrl: (teamId?: string, returnUrl?: string) => 
    apiRequest<{ url: string }>('/integrations/github/install', {}, { team_id: teamId, return_url: returnUrl }),
  listGitHubRepositories: (teamId: string) => apiRequest<any[]>('/integrations/github/repositories', {}, { team_id: teamId }),
  linkGitHubRepository: (teamId: string, repositoryId: number) =>
    apiRequest<any>('/integrations/github/link', { method: 'POST', body: JSON.stringify({ repositoryId }) }, { team_id: teamId }),
  getTeamGitHubRepositories: (teamId: string) =>
    apiRequest<any[]>(`/integrations/github/team/${teamId}`),
  syncGitHubRepositories: (teamId: string) =>
    apiRequest<any>('/integrations/github/sync', { method: 'POST' }, { team_id: teamId }),
  handleGitHubCallback: (installationId: string, setupAction: string, state: string | null) =>
    apiRequest<any>('/integrations/github/callback', { method: 'GET' }, { installation_id: installationId, setup_action: setupAction, state: state || undefined, from_frontend: true }),
  
  // ── Public Invitations ────────────────────────────────────────────────────
  getInvitationDetails: (invitationId: string) => 
    apiRequest<any>(`/invitations/${invitationId}`),
  acceptInvitation: (teamId: string, data: { invitation_id: number; name: string }) =>
    apiRequest<any>(`/teams/${teamId}/invitations/accept`, { method: 'POST', body: JSON.stringify(data) }),

  // ── User Profile ──────────────────────────────────────────────────────────
  getUserProfile: (email: string) => 
    apiRequest<any>(`/users/${encodeURIComponent(email)}/profile`),
  updateUserProfile: (email: string, data: any) =>
    apiRequest<any>(`/users/${encodeURIComponent(email)}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
};
