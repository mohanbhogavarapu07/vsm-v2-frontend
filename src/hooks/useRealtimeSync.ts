import { useEffect, useRef, useCallback } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const POLL_INTERVAL = 8_000; // 8s fallback polling
const SSE_RETRY_DELAY = 5_000;

interface RealtimeEvent {
  type: string;
  payload: any;
  timestamp?: string;
}

/**
 * Real-time sync hook: tries SSE first, falls back to smart polling.
 * Updates Zustand stores directly when events arrive.
 */
export function useRealtimeSync(teamId: string | null, projectId: string | null) {
  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollRef = useRef<number>(0);
  const isSSEConnected = useRef(false);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    const store = useWorkflowStore.getState();
    const notifStore = useNotificationStore.getState();

    switch (event.type) {
      case 'TASK_UPDATED':
      case 'TASK_MOVED': {
        const task = event.payload;
        if (!task?.id) break;
        // Update task in store without full refetch
        const existing = store.tasks.find(t => String(t.id) === String(task.id));
        if (existing) {
          const stages = store.stages;
          const newStage = stages.find(s => s.id === Number(task.status_id || task.currentStageId));
          const updated = {
            ...existing,
            ...task,
            status_id: task.status_id ?? existing.status_id,
            currentStageId: task.currentStageId ?? task.status_id ?? existing.currentStageId,
            status_name: newStage?.name || existing.status_name,
            status_category: newStage?.systemCategory || existing.status_category,
          };
          useWorkflowStore.setState({
            tasks: store.tasks.map(t => String(t.id) === String(task.id) ? updated : t),
          });

          // Show toast for AI-driven moves
          if (event.payload._source === 'AI' || event.type === 'TASK_MOVED') {
            const fromName = existing.status_name || 'Unknown';
            const toName = newStage?.name || 'New Stage';
            toast.info(`🤖 AI moved "${existing.title}"`, {
              description: `${fromName} → ${toName}`,
              duration: 5000,
            });
          }
        } else {
          // New task we don't have — append
          useWorkflowStore.setState({ tasks: [...store.tasks, task] });
        }
        break;
      }

      case 'TASK_CREATED': {
        const task = event.payload;
        if (!task?.id) break;
        const exists = store.tasks.some(t => String(t.id) === String(task.id));
        if (!exists) {
          useWorkflowStore.setState({ tasks: [...store.tasks, task] });
        }
        break;
      }

      case 'TASK_DELETED': {
        const taskId = event.payload?.id || event.payload?.taskId;
        if (taskId) {
          useWorkflowStore.setState({
            tasks: store.tasks.filter(t => String(t.id) !== String(taskId)),
          });
        }
        break;
      }

      case 'AI_DECISION': {
        const decision = event.payload;
        if (decision) {
          store.appendAIDecision(decision);
          notifStore.addNotification({
            type: 'ai_decision',
            title: `AI Decision: ${decision.status}`,
            message: decision.reasoning || 'AI made a workflow decision',
            taskId: decision.taskId,
            severity: decision.status === 'BLOCKED' ? 'critical' : 'info',
          });

          if (decision.status === 'PENDING_APPROVAL' || decision.status === 'PENDING_CONFIRMATION') {
            toast.warning('🤖 AI needs your approval', {
              description: decision.reasoning,
              duration: 10000,
            });
          }
        }
        break;
      }

      case 'BLOCKER_DETECTED': {
        const { taskId, reason } = event.payload || {};
        notifStore.addNotification({
          type: 'blocker',
          title: 'Blocker Detected',
          message: reason || 'A task has been flagged as blocked',
          taskId,
          severity: 'critical',
        });
        toast.error('🚫 Blocker detected', {
          description: reason,
          duration: 8000,
        });
        break;
      }

      case 'SPRINT_UPDATED': {
        // Trigger sprint refetch
        store.fetchSprints();
        break;
      }

      default:
        break;
    }
  }, []);

  // Try SSE connection
  const connectSSE = useCallback(() => {
    if (!teamId) return;

    const userId = localStorage.getItem('vsm_user_id');
    const url = `${API_BASE}/events/stream?team_id=${teamId}${userId ? `&user_id=${userId}` : ''}`;

    try {
      const es = new EventSource(url);
      sseRef.current = es;

      es.onopen = () => {
        isSSEConnected.current = true;
        // Stop polling when SSE is active
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };

      es.onmessage = (msg) => {
        try {
          const event: RealtimeEvent = JSON.parse(msg.data);
          handleEvent(event);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        isSSEConnected.current = false;
        es.close();
        sseRef.current = null;
        // Fall back to polling
        startPolling();
        // Retry SSE after delay
        setTimeout(() => {
          if (!isSSEConnected.current && teamId) {
            connectSSE();
          }
        }, SSE_RETRY_DELAY);
      };
    } catch {
      // SSE not supported or endpoint doesn't exist — use polling
      startPolling();
    }
  }, [teamId, handleEvent]);

  // Fallback: smart polling that diffs against current state
  const poll = useCallback(async () => {
    if (!teamId) return;
    const now = Date.now();
    if (now - lastPollRef.current < POLL_INTERVAL - 500) return;
    lastPollRef.current = now;

    try {
      const { api } = await import('@/lib/api');
      const [tasks, events] = await Promise.all([
        api.listTasks(teamId),
        api.getEventLog(teamId, 20),
      ]);

      const store = useWorkflowStore.getState();

      // Diff tasks: only update if something changed
      const currentIds = new Set(store.tasks.map(t => `${t.id}-${t.status_id}-${t.updatedAt}`));
      const hasChanges = tasks.some((t: any) => !currentIds.has(`${t.id}-${t.status_id}-${t.updatedAt}`));

      if (hasChanges) {
        useWorkflowStore.setState({ tasks });
      }

      // Check for new AI decisions in events
      const aiEvents = (events || []).filter((e: any) =>
        e.event_type === 'AI_DECISION' || e.event_type === 'TASK_MOVED'
      );
      if (aiEvents.length > 0) {
        const lastKnown = store.aiDecisions[0]?.createdAt;
        const newEvents = lastKnown
          ? aiEvents.filter((e: any) => new Date(e.created_at) > new Date(lastKnown))
          : [];
        newEvents.forEach((e: any) => {
          handleEvent({ type: e.event_type, payload: e.metadata || e });
        });
      }
    } catch {
      // Silent fail on polling
    }
  }, [teamId, handleEvent]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    // Immediate first poll
    poll();
  }, [poll]);

  useEffect(() => {
    if (!teamId) return;

    // Try SSE, will fall back to polling if it fails
    connectSSE();
    // Also start polling as immediate backup until SSE connects
    if (!isSSEConnected.current) {
      startPolling();
    }

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      isSSEConnected.current = false;
    };
  }, [teamId, connectSSE, startPolling]);
}
