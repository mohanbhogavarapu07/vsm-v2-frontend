import React, { useState } from 'react';
import { type AIDecision } from '@/stores/workflowStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { Bot, ChevronDown, ChevronUp, ArrowRight, ArrowRightCircle, CheckCircle2, XCircle, AlertTriangle, Clock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AIDecisionCardProps {
  decision: AIDecision;
  onAction?: () => void;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  EXECUTED: { label: 'Executed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800', icon: <CheckCircle2 className="h-3 w-3" /> },
  APPLIED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800', icon: <CheckCircle2 className="h-3 w-3" /> },
  PENDING_APPROVAL: { label: 'Pending Approval', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800', icon: <Clock className="h-3 w-3" /> },
  PENDING_CONFIRMATION: { label: 'Needs Confirmation', className: 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800', icon: <AlertTriangle className="h-3 w-3" /> },
  BLOCKED: { label: 'Blocked', className: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800', icon: <XCircle className="h-3 w-3" /> },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800', icon: <XCircle className="h-3 w-3" /> },
  NO_TRANSITION: { label: 'No Transition', className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700', icon: <Zap className="h-3 w-3" /> },
  FUZZY_LINK: { label: 'Fuzzy Match', className: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800', icon: <Zap className="h-3 w-3" /> },
  RESOLVED_MANUALLY: { label: 'Resolved', className: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800', icon: <CheckCircle2 className="h-3 w-3" /> },
};

export const AIDecisionCard = React.memo(function AIDecisionCard({ decision, onAction }: AIDecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { permissions } = useProjectStore();
  const canApprove = permissions.includes('MANAGE_TEAM');
  const isBlocker = ['PENDING_APPROVAL', 'PENDING_CONFIRMATION', 'BLOCKED'].includes(decision.status || '');

  const taskId = decision.taskId || decision.task_id;
  const taskTitle = decision.taskTitle || decision.task_title || `Task #${taskId}`;
  const fromStage = decision.fromStageName || decision.from_stage_name;
  const toStage = decision.toStageName || decision.to_stage_name;
  const confidence = decision.confidenceScore ?? decision.confidence_score ?? 0;
  const source = decision.decisionSource || decision.decision_source;
  const trigger = decision.triggeredByEvent || decision.triggered_by_event;
  const correlationId = decision.correlationId || decision.correlation_id;
  const createdAt = decision.createdAt || decision.created_at || '';

  const statusCfg = statusConfig[decision.status] || statusConfig['NO_TRANSITION'];

  return (
    <div
      className={cn(
        'rounded-lg border bg-card transition-all duration-200',
        isBlocker && canApprove
          ? 'cursor-pointer hover:border-primary/40 hover:shadow-md'
          : 'hover:shadow-sm',
        isBlocker ? 'border-l-4 border-l-amber-400 dark:border-l-amber-500' : 'border-border/60'
      )}
      onClick={() => isBlocker && canApprove && onAction?.()}
    >
      <div className="p-4">
        {/* Header Row: Title + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                isBlocker ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-primary/10 text-primary'
              )}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground truncate">{taskTitle}</h4>
                <span className="text-[10px] font-mono text-muted-foreground/60">#{taskId}</span>
              </div>

              {/* From → To Transition */}
              {(fromStage || toStage) && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {fromStage && (
                    <span className="inline-flex items-center text-[11px] font-medium bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md">
                      {fromStage}
                    </span>
                  )}
                  <ArrowRightCircle className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                  {toStage && (
                    <span className="inline-flex items-center text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                      {toStage}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn('text-[10px] shrink-0 gap-1 font-semibold', statusCfg.className)}
          >
            {statusCfg.icon}
            {statusCfg.label}
          </Badge>
        </div>

        {/* Reasoning */}
        {decision.reasoning && (
          <div className="mt-3 px-3 py-2.5 rounded-md bg-muted/30 border border-border/30">
            <p className="text-xs text-foreground/80 leading-relaxed italic">
              &ldquo;{decision.reasoning}&rdquo;
            </p>
          </div>
        )}

        {/* Footer: Meta + Expand */}
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {createdAt && (
              <span>{new Date(createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            )}
            {source && <span className="capitalize">{source}</span>}
            {trigger && <span>via {trigger}</span>}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-primary/80 hover:text-primary transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/40 space-y-3 animate-in slide-in-from-top-1 duration-150">
            {/* Confidence bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Confidence</span>
                <span
                  className={cn(
                    'text-[11px] font-bold',
                    confidence > 0.85 ? 'text-emerald-600' : confidence > 0.6 ? 'text-amber-600' : 'text-red-600'
                  )}
                >
                  {Math.round(confidence * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    confidence > 0.85 ? 'bg-emerald-500' : confidence > 0.6 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
              {correlationId && (
                <div>
                  <span className="text-muted-foreground">Correlation ID</span>
                  <p className="font-mono text-foreground/70 truncate">{correlationId}</p>
                </div>
              )}
              {decision.transitionId && (
                <div>
                  <span className="text-muted-foreground">Transition ID</span>
                  <p className="font-mono text-foreground/70">#{decision.transitionId}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Blocker CTA */}
        {isBlocker && canApprove && (
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-primary">
            <ArrowRight className="h-3.5 w-3.5 animate-pulse" />
            Click to resolve blocker
          </div>
        )}
      </div>
    </div>
  );
});
