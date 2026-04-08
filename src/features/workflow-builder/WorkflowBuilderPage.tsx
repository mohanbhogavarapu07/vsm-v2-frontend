import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkflowGraph } from './workflowApi';
import { StageCard } from './StageCard';
import { AddStageForm } from './AddStageForm';
import { TransitionForm } from './TransitionForm';
import { WorkflowReadinessGuard } from './WorkflowReadinessGuard';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function WorkflowBuilderPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [showAddStage, setShowAddStage] = useState(false);
  const [showAddTransition, setShowAddTransition] = useState(false);

  const { data: graph, isLoading, error } = useQuery({
    queryKey: ['workflowGraph', projectId],
    queryFn: () => fetchWorkflowGraph(projectId!)
  });

  if (isLoading) return <div className="p-8">Loading workflow...</div>;
  if (error || !graph) return <div className="p-8 text-red-500">Failed to load workflow graph</div>;

  const maxOrder = graph.stages.reduce((max: number, s: any) => Math.max(max, s.positionOrder), 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workflow Graph Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">Define the strict state machine for your project's tasks.</p>
          </div>
          <Badge variant={graph.readiness === 'ACTIVE' ? 'default' : 'secondary'} className={graph.readiness === 'ACTIVE' ? 'bg-green-600 hover:bg-green-700' : ''}>
            {graph.readiness}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Stages Panel */}
          <Card className="bg-muted/10 shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
              <CardTitle className="text-lg">Stages</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddStage(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Stage
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {showAddStage && (
                <div className="mb-4">
                  <AddStageForm projectId={projectId!} maxOrder={maxOrder} onClose={() => setShowAddStage(false)} />
                </div>
              )}
              <div className="space-y-1">
                {[...graph.stages].sort((a,b) => a.positionOrder - b.positionOrder).map(stage => (
                  <StageCard key={stage.id} projectId={projectId!} stage={stage} />
                ))}
                {graph.stages.length === 0 && !showAddStage && (
                  <p className="text-sm text-muted-foreground py-8 text-center italic">No stages defined.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transitions Panel */}
          <Card className="bg-muted/10 shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
              <CardTitle className="text-lg">Transitions</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddTransition(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Route
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {showAddTransition && (
                <div className="mb-4">
                  <TransitionForm projectId={projectId!} stages={graph.stages} onClose={() => setShowAddTransition(false)} />
                </div>
              )}
              <div className="space-y-3">
                {graph.transitions.map((t: any) => (
                  <div key={t.id} className="flex flex-col p-3 border border-border/50 rounded-lg bg-card shadow-sm hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-3 font-medium text-sm">
                        <span className="truncate max-w-[120px] rounded bg-muted/60 px-2 py-0.5 text-xs">{t.fromStageName}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[120px] rounded bg-muted/60 px-2 py-0.5 text-xs">{t.toStageName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-[10px] bg-background">{t.triggerType}</Badge>
                      {t.githubEventType && <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none shadow-none">{t.githubEventType}</Badge>}
                    </div>
                  </div>
                ))}
                {graph.transitions.length === 0 && !showAddTransition && (
                  <p className="text-sm text-muted-foreground py-8 text-center italic">No transitions defined.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debug/Readiness Wrapper Example Display */}
        <div className="mt-12">
          <WorkflowReadinessGuard readiness={graph.readiness}>
            <div className="p-4 border border-green-200 bg-green-50 rounded-xl shadow-sm dark:border-green-900/50 dark:bg-green-900/10 transition-all">
                <h3 className="font-semibold text-green-800 dark:text-green-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  AI Automation Check Passed
                </h3>
                <p className="text-sm text-green-700/80 mt-2 dark:text-green-500/80">The agent logic engine confirms the workflow graph qualifies as <strong>ACTIVE</strong>. Automatic state traversal rules are bound securely to the Celery tasks and are proactively monitoring Webhook inputs.</p>
            </div>
          </WorkflowReadinessGuard>
        </div>
      </div>
    </div>
  );
}
