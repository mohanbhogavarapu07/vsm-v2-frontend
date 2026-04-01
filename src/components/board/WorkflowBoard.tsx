import { useEffect } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { useWorkflowStore } from '@/stores/workflowStore';
import { KanbanColumn } from './KanbanColumn';
import { TaskDetailPanel } from './TaskDetailPanel';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WorkflowBoard() {
  const { statuses, tasks, loading, error, selectedTaskId, fetchWorkflows, fetchTasks, updateTaskStatus, setSelectedTask } =
    useWorkflowStore();

  useEffect(() => {
    fetchWorkflows();
    fetchTasks();
  }, [fetchWorkflows, fetchTasks]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    if (result.source.droppableId !== destination.droppableId) {
      updateTaskStatus(draggableId, destination.droppableId);
    }
  };

  const sortedStatuses = [...statuses].sort((a, b) => a.stage_order - b.stage_order);

  if (loading && statuses.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && statuses.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { fetchWorkflows(); fetchTasks(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Workflow Board</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} tasks across {statuses.length} stages
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchWorkflows(); fetchTasks(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
            {sortedStatuses.map((status) => (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={tasks.filter((t) => t.status_id === status.id)}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Task Detail Panel */}
      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
