import { useEffect, useMemo, useState } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { useParams } from 'react-router-dom';
import { AIDecisionCard } from '@/components/ai/AIDecisionCard';
import { Bot, RefreshCw, ShieldAlert, CheckCircle2, Clock, XCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'pending' | 'executed' | 'blocked' | 'rejected';

export default function DecisionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentTeamId, ensureDefaultTeam } = useProjectStore();
  const { aiDecisions, fetchAIDecisions, fetchTasks, setTeamId } = useWorkflowStore();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    const boot = async () => {
      if (!projectId) return;
      const teamId = currentTeamId || (await ensureDefaultTeam(projectId));
      setTeamId(teamId);
      await fetchTasks();
      await fetchAIDecisions();
    };
    void boot();
  }, [projectId, currentTeamId]);

  const stats = useMemo(() => {
    const pending = aiDecisions.filter(d => d.status === 'PENDING_APPROVAL' || d.status === 'PENDING_CONFIRMATION');
    const executed = aiDecisions.filter(d => d.status === 'APPLIED' || d.status === 'EXECUTED');
    const blocked = aiDecisions.filter(d => d.status === 'BLOCKED');
    const rejected = aiDecisions.filter(d => d.status === 'RESOLVED_MANUALLY');
    return { pending, executed, blocked, rejected };
  }, [aiDecisions]);

  const filteredDecisions = useMemo(() => {
    if (statusFilter === 'all') return aiDecisions;
    if (statusFilter === 'pending') return stats.pending;
    if (statusFilter === 'executed') return stats.executed;
    if (statusFilter === 'blocked') return stats.blocked;
    if (statusFilter === 'rejected') return stats.rejected;
    return aiDecisions;
  }, [aiDecisions, statusFilter, stats]);

  const statCards = [
    { key: 'pending' as FilterStatus, label: 'Pending', count: stats.pending.length, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { key: 'executed' as FilterStatus, label: 'Executed', count: stats.executed.length, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    { key: 'blocked' as FilterStatus, label: 'Blocked', count: stats.blocked.length, icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10' },
    { key: 'rejected' as FilterStatus, label: 'Manual', count: stats.rejected.length, icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted/40' },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-8 py-6 shrink-0 bg-card">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Bot className="h-6 w-6 text-primary" />
            AI Decision Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, approve, and audit all autonomous agent decisions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAIDecisions}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex-1 p-8 space-y-6 max-w-5xl mx-auto w-full">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => setStatusFilter(statusFilter === card.key ? 'all' : card.key)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-all hover:shadow-sm',
                  statusFilter === card.key
                    ? 'border-primary/40 bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-border/80'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.bg)}>
                    <card.icon className={cn('h-5 w-5', card.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{card.count}</p>
                    <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Active filter indicator */}
        {statusFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium px-2.5 py-1 gap-1.5">
              <Filter className="h-3 w-3" />
              Showing: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setStatusFilter('all')}>
              Clear filter
            </Button>
          </div>
        )}

        {/* Decisions list */}
        {filteredDecisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bot className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {statusFilter !== 'all' ? 'No decisions match this filter.' : 'No AI decisions yet.'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">AI decisions will appear here as the agent processes tasks.</p>
          </div>
        ) : (
          <motion.div 
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {filteredDecisions.map((d) => (
              <motion.div
                key={d.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <AIDecisionCard decision={d} onAction={fetchAIDecisions} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
