import { useState } from 'react';
import { useWorkflowStore, type Task, type WorkflowStatus } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { TaskCard } from './TaskCard';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const categoryColors: Record<string, string> = {
  BACKLOG: 'border-t-muted-foreground/30',
  ACTIVE: 'border-t-primary',
  REVIEW: 'border-t-warning',
  VALIDATION: 'border-t-info',
  DONE: 'border-t-success',
  BLOCKED: 'border-t-destructive',
};

const categoryBg: Record<string, string> = {
  BACKLOG: 'bg-kanban-backlog',
  ACTIVE: 'bg-kanban-active',
  REVIEW: 'bg-kanban-review',
  VALIDATION: 'bg-kanban-validation',
  DONE: 'bg-kanban-done',
  BLOCKED: 'bg-kanban-blocked',
};

interface KanbanColumnProps {
  status: WorkflowStatus;
  tasks: Task[];
}

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { createTask } = useWorkflowStore();
  const { permissions } = useProjectStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      setIsCreating(false);
      return;
    }
    setIsSubmitting(true);
    await createTask(newTaskTitle.trim(), status.id);
    setNewTaskTitle('');
    setIsSubmitting(false);
    setIsCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateTask();
    if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTaskTitle('');
    }
  };

  return (
    <div
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border-t-2',
        categoryColors[status.category] || 'border-t-border',
        categoryBg[status.category] || 'bg-muted'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{status.name}</h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background px-1.5 text-xs font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {status.category}
        </span>
      </div>

      {/* Cards */}
      <Droppable droppableId={status.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 space-y-2 overflow-y-auto px-2 pb-2 scrollbar-thin',
              snapshot.isDraggingOver && 'bg-primary/5'
            )}
            style={{ minHeight: 60 }}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <TaskCard task={task} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <div className="pt-2 pb-1 px-1">
              {isCreating ? (
                <div className="flex flex-col gap-2 rounded-md border bg-card p-2 shadow-sm">
                  <Input 
                    autoFocus
                    placeholder="What needs to be done?" 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    className="h-8 text-sm"
                  />
                  <div className="flex items-center justify-end gap-1">
                     <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted" onClick={() => setIsCreating(false)} disabled={isSubmitting}>
                       <X className="h-3.5 w-3.5" />
                     </Button>
                     <Button size="sm" className="h-6 px-2 text-xs" onClick={handleCreateTask} disabled={isSubmitting || !newTaskTitle.trim()}>
                       Add
                     </Button>
                  </div>
                </div>
              ) : (
                permissions.includes('CREATE_TASK') && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-muted-foreground hover:bg-muted font-normal h-8 px-2 text-xs"
                    onClick={() => setIsCreating(true)}
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Create
                  </Button>
                )
              )}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
}
