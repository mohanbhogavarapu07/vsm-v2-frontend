import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useWorkflowStore } from '@/stores/workflowStore';
import { motion } from 'framer-motion';
import { X, GitCommit, GitPullRequest, CheckCircle2, XCircle, Bot, Activity, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const task = useWorkflowStore((s) => s.tasks.find((t) => t.id === taskId));
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTaskActivity(taskId)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (!task) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-border bg-card shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="text-xs text-muted-foreground">Task #{task.id}</p>
          <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto pb-20 scrollbar-thin">
        <Tabs defaultValue="info" className="p-6">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
            <TabsTrigger value="dev" className="flex-1">Dev Activity</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            {task.description && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Description</h3>
                <p className="text-sm text-foreground">{task.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Status</h3>
                <Badge variant="secondary">{task.status_name || task.status_id}</Badge>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Assignee</h3>
                <p className="text-sm text-foreground">{task.assignee_name || 'Unassigned'}</p>
              </div>
              {task.priority && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Priority</h3>
                  <Badge variant="outline" className="uppercase">{task.priority}</Badge>
                </div>
              )}
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Created</h3>
                <p className="text-sm text-foreground">
                  {new Date(task.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dev" className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading activities...</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dev activity yet.</p>
            ) : (
              activities.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  {a.activity_type === 'COMMIT' && <GitCommit className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                  {a.activity_type === 'PR' && <GitPullRequest className="mt-0.5 h-4 w-4 text-primary" />}
                  {a.activity_type === 'CI' && (
                    a.metadata?.status === 'passed'
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                      : <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{a.metadata?.message || a.reference_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="ai" className="space-y-3">
            {task.ai_signals && task.ai_signals.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">AI Analysis</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Signals Detected</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {task.ai_signals.map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    {task.ai_confidence != null && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Confidence</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-border">
                            <div
                              className={cn(
                                'h-2 rounded-full',
                                task.ai_confidence > 0.85
                                  ? 'bg-success'
                                  : task.ai_confidence > 0.6
                                  ? 'bg-warning'
                                  : 'bg-destructive'
                              )}
                              style={{ width: `${task.ai_confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">
                            {Math.round(task.ai_confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No AI insights for this task yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
