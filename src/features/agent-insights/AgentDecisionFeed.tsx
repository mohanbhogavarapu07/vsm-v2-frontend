import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkflowStore, AIDecision as AgentDecision } from '@/stores/workflowStore';
import { ArrowRight, Brain, Clock, ShieldCheck, AlertCircle, HelpCircle, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
function getHeaders() {
  const userId = localStorage.getItem('vsm_user_id');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) headers['X-User-ID'] = userId;
  return headers;
}


export default function AgentDecisionFeed() {
  const { projectId } = useParams<{ projectId: string }>();
  
  // Real implement would fetch from API, using mock/sim for flow
  const { data: decisions, isLoading } = useQuery<AgentDecision[]>({
    queryKey: ['agentDecisions', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects/${projectId}/agent-decisions`, { headers: getHeaders() });
      return res.json();
    },
    enabled: !!projectId
  });

  if (isLoading) return <div className="p-8">Loading agent decisions...</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPLIED': return <Badge className="bg-green-500 hover:bg-green-600"><ShieldCheck className="h-3 w-3 mr-1" /> APPLIED</Badge>;
      case 'BLOCKED': return <Badge variant="destructive"><ShieldCheck className="h-3 w-3 mr-1" /> BLOCKED</Badge>;
      case 'NO_TRANSITION': return <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white"><AlertCircle className="h-3 w-3 mr-1" /> NO_TRANSITION</Badge>;
      case 'FUZZY_LINK': return <Badge className="bg-blue-500 hover:bg-blue-600"><HelpCircle className="h-3 w-3 mr-1" /> FUZZY_LINK</Badge>;
      case 'PENDING_CONFIRMATION': return <Badge variant="outline" className="border-gray-400 text-gray-500"><UserCheck className="h-3 w-3 mr-1" /> PENDING</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agent Decision Feed</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Audit trail of the AI's autonomous workflow executions.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {decisions?.map((decision) => (
          <Card key={decision.id} className="overflow-hidden border-border/60 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row">
              <div className={`w-1.5 ${decision.status === 'APPLIED' ? 'bg-green-500' : decision.status === 'BLOCKED' ? 'bg-red-500' : 'bg-amber-400'}`} />
              <div className="flex-1 p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        {decision.task_title || decision.taskTitle || `Task #${decision.task_id ?? decision.taskId}`}
                      </span>
                      <span className="text-xs font-mono bg-muted/60 border border-border/40 rounded px-1.5 py-0.5 text-muted-foreground">
                        #{decision.task_id ?? decision.taskId}
                      </span>
                      {(decision.correlationId || decision.correlation_id) && (
                        <span className="text-xs text-muted-foreground font-mono">
                          [{(decision.correlationId || decision.correlation_id || '').slice(0, 8)}...]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <Clock className="h-3.5 w-3.5" />
                       <span>{formatDistanceToNow(new Date(decision.createdAt || decision.created_at || ''), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(decision.status)}
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wider font-semibold">Confidence</div>
                      <div className="font-bold text-sm">{(decision.confidenceScore * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-muted/40 rounded-lg border border-border/40">
                   <div className="flex items-start gap-2">
                     <Brain className="h-4 w-4 mt-1 text-primary/80" />
                     <p className="text-sm leading-relaxed italic text-foreground/90">"{decision.reasoning}"</p>
                   </div>
                </div>

                {(decision.from_stage_name || decision.fromStageName || decision.from_stage_id || decision.fromStageId ||
                  decision.to_stage_name || decision.toStageName || decision.to_stage_id || decision.toStageId) && (
                  <div className="mt-4 flex items-center gap-3 text-sm font-medium">
                    <span className="px-2 py-0.5 rounded bg-muted/80 text-foreground border border-border/50 text-xs uppercase">
                      {decision.from_stage_name || decision.fromStageName || `Stage #${decision.from_stage_id ?? decision.fromStageId ?? '?'}`}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-xs uppercase">
                      {decision.to_stage_name || decision.toStageName || `Stage #${decision.to_stage_id ?? decision.toStageId ?? '?'}`}
                    </span>
                  </div>
                )}

                {decision.status === 'PENDING_CONFIRMATION' && (
                  <div className="mt-5 flex gap-3">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">Accept Link</Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 border-red-200">Reject</Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {decisions?.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-border/60 rounded-2xl bg-muted/20">
             <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
             <p className="text-lg font-medium text-muted-foreground">No decisions logged yet.</p>
             <p className="text-sm text-muted-foreground mt-1">Once the workflow is ACTIVE, agent activity will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
