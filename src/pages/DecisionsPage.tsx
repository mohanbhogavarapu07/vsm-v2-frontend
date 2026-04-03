import { useEffect } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { useParams } from 'react-router-dom';
import { AIDecisionCard } from '@/components/ai/AIDecisionCard';
import { Bot, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DecisionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentTeamId, ensureDefaultTeam } = useProjectStore();
  const { aiDecisions, fetchAIDecisions, fetchTasks, setTeamId } = useWorkflowStore();

  useEffect(() => {
    const boot = async () => {
      if (!projectId) return;
      const teamId = currentTeamId || (await ensureDefaultTeam(projectId));
      setTeamId(teamId);
      await fetchTasks();
      await fetchAIDecisions();
    };
    void boot();
  }, [projectId, currentTeamId, ensureDefaultTeam, setTeamId, fetchTasks, fetchAIDecisions]);

  const pending = aiDecisions.filter((d) => d.status === 'PENDING_APPROVAL');
  const others = aiDecisions.filter((d) => d.status !== 'PENDING_APPROVAL');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Decisions</h1>
          <p className="text-sm text-muted-foreground">
            {pending.length} pending approval · {aiDecisions.length} total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAIDecisions}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {aiDecisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bot className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No AI decisions yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase text-warning">
                  Pending Approval ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((d) => (
                    <AIDecisionCard key={d.id} decision={d} onAction={fetchAIDecisions} />
                  ))}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                  History
                </h2>
                <div className="space-y-3">
                  {others.map((d) => (
                    <AIDecisionCard key={d.id} decision={d} onAction={fetchAIDecisions} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
