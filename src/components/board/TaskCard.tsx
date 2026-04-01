import { type Task } from '@/stores/workflowStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GitPullRequest, CheckCircle2, XCircle, AlertTriangle, Bot, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-destructive/10 text-destructive border-destructive/20',
  HIGH: 'bg-warning/10 text-warning border-warning/20',
  MEDIUM: 'bg-info/10 text-info border-info/20',
  LOW: 'bg-muted text-muted-foreground border-border',
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
  const setSelectedTask = useWorkflowStore((s) => s.setSelectedTask);

  const initials = task.assignee_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card
      className="cursor-pointer border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => setSelectedTask(task.id)}
    >
      <div className="space-y-2">
        {/* Title & Priority */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-snug text-foreground line-clamp-2">
            {task.title}
          </h4>
          {task.priority && (
            <Badge
              variant="outline"
              className={cn('shrink-0 text-[10px] uppercase', priorityColors[task.priority])}
            >
              {task.priority}
            </Badge>
          )}
        </div>

        {/* ID */}
        <p className="text-xs text-muted-foreground">#{task.id}</p>

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
        {task.assignee_name && (
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">{task.assignee_name}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
