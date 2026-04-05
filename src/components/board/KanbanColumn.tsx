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
        'flex w-[320px] shrink-0 flex-col rounded-xl border-t-[3px] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.01)] relative',
        categoryColors[status.category] || 'border-t-border',
        categoryBg[status.category] || 'bg-muted'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3.5 sticky top-0 z-10 rounded-t-xl bg-inherit backdrop-blur-sm bg-opacity-95">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[13px] font-bold text-foreground/90 uppercase tracking-wide">{status.name}</h3>
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-background/80 shadow-sm px-1.5 text-xs font-semibold text-foreground">
            {tasks.length}
          </span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
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
              'flex-1 space-y-3 overflow-y-auto px-3 pb-3 scrollbar-thin',
              snapshot.isDraggingOver && 'bg-primary/5'
            )}
            style={{ minHeight: 60 }}
          >
            {tasks.map((task, index) => (
              <Draggable 
                key={task.id} 
                draggableId={task.id} 
                index={index}
                isDragDisabled={!permissions.includes('UPDATE_TASK')}
              >
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
            <div className="pt-2 pb-2 px-1">
              {isCreating ? (
                <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-md">
                  <Input 
                    autoFocus
                    placeholder="What needs to be done?" 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    className="h-9 text-sm rounded-lg"
                  />
                  <div className="flex items-center justify-end gap-2 mt-1">
                     <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-muted rounded-full" onClick={() => setIsCreating(false)} disabled={isSubmitting}>
                       <X className="h-4 w-4" />
                     </Button>
                     <Button size="sm" className="h-7 px-3 text-xs rounded-full font-semibold shadow-sm" onClick={handleCreateTask} disabled={isSubmitting || !newTaskTitle.trim()}>
                       Add Task
                     </Button>
                  </div>
                </div>
              ) : (
                permissions.includes('CREATE_TASK') && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-muted-foreground hover:bg-background/80 hover:text-foreground font-medium h-9 px-3 text-xs rounded-lg transition-colors"
                    onClick={() => setIsCreating(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
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
