import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }
  return response.json();
}

// Workflow APIs
export const api = {
  // Workflows
  getWorkflows: () => apiRequest<any[]>('/api/workflows'),
  getWorkflow: (id: string) => apiRequest<any>(`/api/workflows/${id}`),

  // Tasks
  getTasks: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<any[]>(`/api/tasks${query}`);
  },
  getTask: (id: string) => apiRequest<any>(`/api/tasks/${id}`),
  updateTask: (id: string, data: any) =>
    apiRequest<any>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createTask: (data: any) =>
    apiRequest<any>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),

  // Task Activity
  getTaskActivity: (taskId: string) => apiRequest<any[]>(`/api/tasks/${taskId}/activity`),

  // AI Decisions
  getAIDecisions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<any[]>(`/api/ai/decisions${query}`);
  },
  submitFeedback: (data: { decision_id: string; feedback: string; correct_action?: string }) =>
    apiRequest<any>('/api/ai/feedback', { method: 'POST', body: JSON.stringify(data) }),
  approveDecision: (decisionId: string) =>
    apiRequest<any>(`/api/ai/decisions/${decisionId}/approve`, { method: 'POST' }),
  rejectDecision: (decisionId: string) =>
    apiRequest<any>(`/api/ai/decisions/${decisionId}/reject`, { method: 'POST' }),

  // AI Chat
  sendChatMessage: (message: string, context?: any) =>
    apiRequest<any>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message, context }) }),

  // Event Log
  getEventLog: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<any[]>(`/api/events${query}`);
  },

// Organizations
  getOrganization: () => apiRequest<any>('/api/organization'),

  // Users
  getUsers: () => apiRequest<any[]>('/api/users'),

  // Projects
  getProjects: () => apiRequest<any[]>('/api/projects'),
  getProject: (id: string) => apiRequest<any>(`/api/projects/${id}`),
  createProject: (data: { name: string; description?: string; key?: string }) =>
    apiRequest<any>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) =>
    apiRequest<any>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    apiRequest<any>(`/api/projects/${id}`, { method: 'DELETE' }),

  // Roles
  getProjectRoles: (projectId: string) =>
    apiRequest<any[]>(`/api/projects/${projectId}/roles`),
  createRole: (projectId: string, data: { name: string; description?: string; permissions: string[] }) =>
    apiRequest<any>(`/api/projects/${projectId}/roles`, { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (projectId: string, roleId: string, data: any) =>
    apiRequest<any>(`/api/projects/${projectId}/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRole: (projectId: string, roleId: string) =>
    apiRequest<any>(`/api/projects/${projectId}/roles/${roleId}`, { method: 'DELETE' }),

  // Team Members
  getProjectMembers: (projectId: string) =>
    apiRequest<any[]>(`/api/projects/${projectId}/members`),
  inviteMember: (projectId: string, data: { email: string; role_id: string }) =>
    apiRequest<any>(`/api/projects/${projectId}/members/invite`, { method: 'POST', body: JSON.stringify(data) }),
  updateMemberRole: (projectId: string, memberId: string, roleId: string) =>
    apiRequest<any>(`/api/projects/${projectId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role_id: roleId }) }),
  removeMember: (projectId: string, memberId: string) =>
    apiRequest<any>(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),

  // Permissions (predefined list)
  getPermissions: () => apiRequest<any[]>('/api/permissions'),
};
