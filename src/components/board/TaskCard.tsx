import { type Task } from '@/stores/workflowStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Zap,
  Bot,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Minus,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityStyles: Record<string, { className: string; icon: JSX.Element }> = {
  CRITICAL: { className: 'bg-destructive/10 text-destructive border-transparent', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
  HIGH: { className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-transparent', icon: <ChevronUp className="h-3 w-3 mr-1" /> },
  MEDIUM: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-transparent', icon: <Minus className="h-3 w-3 mr-1" /> },
  LOW: { className: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-transparent', icon: <ChevronDown className="h-3 w-3 mr-1" /> },
};

const ciIcons: Record<string, JSX.Element> = {
  passed: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  running: <Zap className="h-3.5 w-3.5 animate-pulse-dot text-warning" />,
};

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { setSelectedTask, updateTaskPriority, updateTaskAssignee, deleteTask, sprints, setIsTaskEditMode } = useWorkflowStore();
  const members = useProjectStore((s) => s.members);

  const sprintName = task.sprint_id 
    ? sprints.find(s => s.id === String(task.sprint_id))?.name || 'Active Sprint'
    : 'Backlog';

  // Derive assignee name either from task object directly or fallback to store lookup
  const matchedMember = members.find((m) => m.id === String(task.assignee_id));
  const derivedAssigneeName = matchedMember?.full_name || matchedMember?.email || task.assignee_name;

  const initials = derivedAssigneeName
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card
      className="cursor-pointer border-border/60 bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] hover:border-border/80"
      onClick={() => setSelectedTask(task.id)}
    >
      <div className="space-y-2">
        {/* Title, Priority & Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <h4 className="text-sm font-medium leading-snug text-foreground line-clamp-2 pr-2">
              {task.title}
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-muted-foreground font-medium">{sprintName}</p>
              {task.priority && priorityStyles[task.priority] && (
                <Badge
                  variant="outline"
                  className={cn('shrink-0 text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0', priorityStyles[task.priority].className)}
                >
                  <span className="flex items-center">
                    {priorityStyles[task.priority].icon}
                    {task.priority}
                  </span>
                </Badge>
              )}
            </div>
          </div>
          
          <div className="shrink-0 relative z-10" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors cursor-pointer">
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {
                  setSelectedTask(task.id);
                  setIsTaskEditMode(true);
                }}>
                  Edit Task
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Change Priority</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                        <DropdownMenuItem key={p} onClick={() => updateTaskPriority(task.id, p as any)}>
                          <span className={cn("flex items-center text-xs font-semibold px-1 py-0.5 rounded-sm", priorityStyles[p].className)}>
                            {priorityStyles[p].icon}
                            {p}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteTask(task.id)}
                >
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Signals row */}
        <div className="flex items-center gap-2">
          {/* PR Status */}
          {task.pr_status && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <GitPullRequest className="h-3.5 w-3.5" />
              <span className="capitalize">{task.pr_status}</span>
            </div>
          )}

          {/* CI Status */}
          {task.ci_status && ciIcons[task.ci_status]}

          {/* AI Signals */}
          {task.ai_signals && task.ai_signals.length > 0 && (
            <div className="flex items-center gap-1">
              <Bot className="h-3.5 w-3.5 text-primary" />
              {task.ai_confidence != null && (
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    task.ai_confidence > 0.85
                      ? 'text-success'
                      : task.ai_confidence > 0.6
                      ? 'text-warning'
                      : 'text-destructive'
                  )}
                >
                  {Math.round(task.ai_confidence * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="cursor-pointer outline-none">
                {derivedAssigneeName ? (
                  <div className="flex items-center gap-2" title={derivedAssigneeName}>
                    <Avatar className="h-6 w-6 border border-border/50">
                      <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs font-medium text-muted-foreground">{derivedAssigneeName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/unassigned" title="Unassigned">
                    <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30 transition-colors group-hover/unassigned:border-primary/50 group-hover/unassigned:bg-primary/5">
                      <UserPlus className="h-3 w-3 text-muted-foreground/50 group-hover/unassigned:text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground/60 group-hover/unassigned:text-primary transition-colors">Unassigned</span>
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => updateTaskAssignee(task.id, null)}>
                Unassign
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {members.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => updateTaskAssignee(task.id, m.id)}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[8px]">
                      {m.full_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{m.full_name || m.email}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
