import { type Task, type WorkflowStatus } from '@/stores/workflowStore';
import { TaskCard } from './TaskCard';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

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
          </div>
        )}
      </Droppable>
    </div>
  );
}
