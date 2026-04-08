import { type AIDecision } from '@/stores/workflowStore';
import { api } from '@/lib/api';
import { Bot, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';

interface AIDecisionCardProps {
  decision: AIDecision;
  onAction?: () => void;
}

const statusStyles: Record<string, string> = {
  EXECUTED: 'bg-success/10 text-success border-success/20',
  APPLIED: 'bg-success/10 text-success border-success/20',
  PENDING_APPROVAL: 'bg-warning/10 text-warning border-warning/20',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function AIDecisionCard({ decision, onAction }: AIDecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);
  const currentTeamId = useWorkflowStore((s) => s.currentTeamId);
  const { permissions } = useProjectStore();
  const canApprove = permissions.includes('MANAGE_TEAM');

  const handleApprove = async () => {
    setActing(true);
    try {
      if (!currentTeamId) throw new Error('No team selected');
      await api.approveDecision(String(decision.taskId), decision.id, currentTeamId);
      onAction?.();
    } catch {
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      if (!currentTeamId) throw new Error('No team selected');
      await api.rejectDecision(String(decision.taskId), decision.id, currentTeamId);
      onAction?.();
    } catch {
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{decision.reasoning}</p>
            <Badge variant="outline" className={cn('text-[10px]', statusStyles[decision.status])}>
              {decision.status.replace('_', ' ')}
            </Badge>
          </div>
          {decision.taskTitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">Task: {decision.taskTitle}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{decision.reasoning}</p>

          {/* Expandable details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 rounded-md bg-muted p-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Confidence</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-border">
                    <div
                      className={cn(
                        'h-1.5 rounded-full',
                        decision.confidenceScore > 0.85 ? 'bg-success' : decision.confidenceScore > 0.6 ? 'bg-warning' : 'bg-destructive'
                      )}
                      style={{ width: `${decision.confidenceScore * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold">{Math.round(decision.confidenceScore * 100)}%</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {new Date(decision.createdAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Approval buttons */}
          {decision.status === 'PENDING_APPROVAL' && (
            <div className="mt-3 flex gap-2">
              <Button 
                size="sm" 
                onClick={handleApprove} 
                disabled={acting || !canApprove}
                className={!canApprove ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Check className="mr-1 h-3 w-3" /> Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleReject} 
                disabled={acting || !canApprove}
                className={!canApprove ? "opacity-50 cursor-not-allowed" : ""}
              >
                <X className="mr-1 h-3 w-3" /> Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
