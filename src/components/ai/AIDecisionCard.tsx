import { type AIDecision } from '@/stores/workflowStore';
import { api } from '@/lib/api';
import { Bot, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
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
  PENDING_CONFIRMATION: 'bg-destructive/10 text-destructive border-destructive/40 border-2 font-semibold',
  BLOCKED: 'bg-destructive/20 text-destructive border-destructive/50 border-2 font-bold animate-pulse',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function AIDecisionCard({ decision, onAction }: AIDecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { permissions } = useProjectStore();
  const canApprove = permissions.includes('MANAGE_TEAM');
  const isBlocker = ['PENDING_APPROVAL', 'PENDING_CONFIRMATION', 'BLOCKED'].includes(decision.status || '');

  return (
    <div 
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-all",
        isBlocker && canApprove ? "cursor-pointer hover:border-primary/50 hover:shadow-md ring-offset-background hover:ring-2 hover:ring-primary/20" : "",
        isBlocker ? "border-l-4 border-l-destructive/50" : ""
      )}
      onClick={() => isBlocker && canApprove && onAction?.()}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isBlocker ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}>
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground line-clamp-1">{decision.taskTitle || 'Analyzing Activity...'}</p>
            <Badge variant="outline" className={cn('text-[10px]', decision.status ? statusStyles[decision.status] : '')}>
              {(decision.status || 'UNKNOWN').replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="mt-1.5 p-2 rounded bg-muted/30 border border-border/40">
            <p className="text-xs text-foreground italic leading-relaxed">
               &quot;{decision.reasoning}&quot;
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {new Date(decision.createdAt).toLocaleTimeString()} • ID: #{decision.id}
            </p>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
            >
              {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              {expanded ? 'Hide' : 'Details'}
            </button>
          </div>

          {expanded && (
            <div className="mt-2 space-y-2 rounded-md bg-muted p-3">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">Task Confidence</p>
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
                  <span className="text-[10px] font-semibold">{Math.round(decision.confidenceScore * 100)}%</span>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground">
                Correlation ID: {decision.correlationId}
              </p>
            </div>
          )}
          
          {isBlocker && canApprove && (
            <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse">
               <ArrowRight className="h-3 w-3" /> Click card to resolve blocker
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
