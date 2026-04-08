const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getHeaders() {
  const userId = localStorage.getItem('vsm_user_id');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) headers['X-User-ID'] = userId;
  return headers;
}

export const fetchWorkflowGraph = async (projectId: string) => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/workflow/graph`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch graph');
  return res.json();
};

export const createWorkflowStage = async (projectId: string, data: any) => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/stages`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create stage');
  return res.json();
};

export const updateWorkflowStage = async (projectId: string, stageId: number, data: any) => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/stages/${stageId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update stage');
  return res.json();
};

export const createWorkflowTransition = async (projectId: string, data: any) => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/transitions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create transition');
  return res.json();
};

export const classifyWorkflowStage = async (projectId: string, stageName: string) => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/stages/classify`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name: stageName }),
  });
  if (!res.ok) throw new Error('Failed to classify stage');
  return res.json();
};
