import React, { useState, useCallback } from 'react';
import { useWorkflowStore, type Task, type WorkflowStage } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { TaskCard } from './TaskCard';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Plus, X, ChevronUp, ChevronDown, Minus, AlertTriangle, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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

const priorityOptions = [
  { value: 'LOW', label: 'Low', icon: <ChevronDown className="h-3.5 w-3.5 text-slate-500" />, color: 'text-slate-500' },
  { value: 'MEDIUM', label: 'Medium', icon: <Minus className="h-3.5 w-3.5 text-amber-500" />, color: 'text-amber-500' },
  { value: 'HIGH', label: 'High', icon: <ChevronUp className="h-3.5 w-3.5 text-red-500" />, color: 'text-red-500' },
  { value: 'CRITICAL', label: 'Critical', icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />, color: 'text-red-600' },
];

interface KanbanColumnProps {
  status: WorkflowStage;
  tasks: Task[];
}

export const KanbanColumn = React.memo(function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { createTask } = useWorkflowStore();
  const { permissions, members } = useProjectStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newAssigneeId, setNewAssigneeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPriority = priorityOptions.find(p => p.value === newPriority) || priorityOptions[1];
  const selectedAssignee = newAssigneeId ? members.find(m => m.id === newAssigneeId) : null;

  const resetForm = useCallback(() => {
    setNewTaskTitle('');
    setNewPriority('MEDIUM');
    setNewAssigneeId(null);
    setIsCreating(false);
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim()) {
      resetForm();
      return;
    }
    setIsSubmitting(true);
    await createTask(newTaskTitle.trim(), status.id, undefined, newAssigneeId, newPriority);
    setIsSubmitting(false);
    resetForm();
  }, [newTaskTitle, status.id, newAssigneeId, newPriority, createTask, resetForm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateTask();
    }
    if (e.key === 'Escape') resetForm();
  }, [handleCreateTask, resetForm]);

  return (
    <div
      className={cn(
        'flex w-[300px] shrink-0 flex-col rounded-xl border-t-[3px] shadow-[0_1px_6px_-2px_rgba(0,0,0,0.03)] relative',
        categoryColors[status.systemCategory] || 'border-t-border',
        categoryBg[status.systemCategory] || 'bg-muted'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3.5 py-3 sticky top-0 z-10 rounded-t-xl bg-inherit backdrop-blur-sm bg-opacity-95">
        <div className="flex items-center gap-2">
          <h3 className="text-[12px] font-bold text-foreground/90 uppercase tracking-wide">{status.name}</h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background/80 shadow-sm px-1.5 text-[11px] font-semibold text-foreground/70">
            {tasks.length}
          </span>
        </div>
        {permissions.includes('CREATE_TASK') && !isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Cards */}
      <Droppable droppableId={String(status.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-2.5 scrollbar-thin transition-colors duration-150',
              snapshot.isDraggingOver && 'bg-primary/[0.04]'
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
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                      'transition-shadow duration-150',
                      snapshot.isDragging && 'rotate-[1.5deg] shadow-xl'
                    )}
                  >
                    <TaskCard task={task} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {/* Jira-style Create Task Card */}
            <div className="pt-1 pb-1">
              {isCreating ? (
                <div className="rounded-lg border border-primary/30 bg-card p-3 shadow-md ring-1 ring-primary/10 animate-in fade-in slide-in-from-top-1 duration-150">
                  <Input 
                    autoFocus
                    placeholder="What needs to be done?" 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    className="h-8 text-sm border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  />
                  
                  {/* Bottom row: Assignee + Priority + Actions */}
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                      {/* Assignee Selector */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="h-7 flex items-center gap-1.5 px-2 rounded-md text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors border border-transparent hover:border-border/40"
                            disabled={isSubmitting}
                          >
                            {selectedAssignee ? (
                              <>
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-[8px] bg-primary/15 text-primary font-semibold">
                                    {selectedAssignee.full_name?.[0]?.toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[80px]">{selectedAssignee.full_name || selectedAssignee.email}</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Assign</span>
                              </>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem onClick={() => setNewAssigneeId(null)}>
                            <UserPlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            Unassigned
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {members.map((m) => (
                            <DropdownMenuItem
                              key={m.id}
                              onClick={() => setNewAssigneeId(m.id)}
                              className="flex items-center gap-2"
                            >
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[8px]">
                                  {m.full_name?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{m.full_name || m.email}</span>
                              {newAssigneeId === m.id && <Check className="h-3 w-3 ml-auto text-primary" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Priority Selector */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="h-7 flex items-center gap-1 px-2 rounded-md text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors border border-transparent hover:border-border/40"
                            disabled={isSubmitting}
                          >
                            {selectedPriority.icon}
                            <span className={cn("text-[11px] font-medium", selectedPriority.color)}>{selectedPriority.label}</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-36">
                          {priorityOptions.map((p) => (
                            <DropdownMenuItem
                              key={p.value}
                              onClick={() => setNewPriority(p.value)}
                              className="flex items-center gap-2"
                            >
                              {p.icon}
                              <span className={cn("text-xs font-medium", p.color)}>{p.label}</span>
                              {newPriority === p.value && <Check className="h-3 w-3 ml-auto text-primary" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-muted rounded-md" 
                        onClick={resetForm} 
                        disabled={isSubmitting}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-7 px-3 text-[11px] rounded-md font-semibold shadow-sm" 
                        onClick={handleCreateTask} 
                        disabled={isSubmitting || !newTaskTitle.trim()}
                      >
                        {isSubmitting ? (
                          <span className="h-3 w-3 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                          'Create'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                permissions.includes('CREATE_TASK') && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-muted-foreground/70 hover:bg-background/60 hover:text-foreground font-medium h-8 px-2.5 text-xs rounded-lg transition-colors"
                    onClick={() => setIsCreating(true)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
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
});
