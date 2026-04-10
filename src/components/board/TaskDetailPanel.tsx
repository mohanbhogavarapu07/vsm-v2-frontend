import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { X, GitCommit, GitPullRequest, CheckCircle2, XCircle, Bot, Activity, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentTeamId, ensureDefaultTeam, members, permissions } = useProjectStore();
  const { tasks, updateTaskAssignee, updateTaskDetails, isTaskEditMode, setIsTaskEditMode } = useWorkflowStore();
  const task = tasks.find((t) => t.id === taskId);
  const [activities, setActivities] = useState<any[]>([]);
  const [aiDecisions, setAiDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Close the panel and reset edit mode globally
  const handleClose = () => {
    setIsTaskEditMode(false);
    
    // Smoothly drop the URL task ID routing
    const newPath = window.location.pathname.replace(/\/task\/[^/]+/, '');
    window.history.pushState({}, '', newPath || '/');
    
    onClose();
  };

  // Sync state when task changes or edit mode toggles
  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.description || '');
    }
  }, [task, isTaskEditMode]);

  const handleSave = async () => {
    if (!editTitle.trim()) {
      toast.error('Task title is required');
      return;
    }
    setIsSaving(true);
    try {
      await updateTaskDetails(taskId, { title: editTitle, description: editDesc });
      toast.success('Task details updated');
      setIsTaskEditMode(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!projectId) return;
        const teamId = currentTeamId || (await ensureDefaultTeam(projectId));
        
        // Fetch dev activity and AI decisions in parallel
        const [activityData, decisionsData] = await Promise.all([
          api.getTaskActivity(taskId, teamId).catch(() => []),
          api.getTaskDecisions(taskId, teamId).catch(() => [])
        ]);
        
        // Filter dev activity: only standard Dev updates, hide backend system status changes if wanted
        const devLogs = activityData.filter((a: any) => 
           a.activity_type === 'COMMIT' || 
           a.activity_type === 'PR' || 
           a.activity_type === 'CI' ||
           // Also allow status changes done by humans
           (a.activity_type === 'STATUS_CHANGE' && !a.metadata?.ai_decision_id)
        );
        
        setActivities(devLogs);
        setAiDecisions(decisionsData);
      } catch {
        setActivities([]);
        setAiDecisions([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [taskId, projectId, currentTeamId, ensureDefaultTeam]);

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
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-mono">Task #{task.id}</p>
            {!isTaskEditMode && permissions.includes('UPDATE_TASK') && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setIsTaskEditMode(true)}>
                Edit Task
              </Button>
            )}
          </div>
          {isTaskEditMode ? (
            <Input 
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mt-1 font-semibold text-lg"
              autoFocus
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground mt-1">{task.title}</h2>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} className="shrink-0 self-start">
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
            {isTaskEditMode ? (
              <div className="space-y-4 mb-6 relative">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Description</h3>
                  <Textarea 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="min-h-[100px] resize-y text-sm"
                    placeholder="Add a more detailed description..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={isSaving || !editTitle.trim()}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsTaskEditMode(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                </div>
                <Separator className="my-4" />
              </div>
            ) : task.description && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Description</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Status</h3>
                <Badge variant="secondary" className="mt-1">{task.status_name || task.status_id || 'Unknown'}</Badge>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Assignee</h3>
                <Select
                  value={String(task.assignee_id || 'unassigned')}
                  onValueChange={(val) => updateTaskAssignee(task.id, val === 'unassigned' ? null : val)}
                  disabled={!permissions.includes('UPDATE_TASK')}
                >
                  <SelectTrigger className={cn(
                    "h-8 text-[13px] border-transparent -ml-3 transition-colors",
                    permissions.includes('UPDATE_TASK') ? "hover:border-border" : "cursor-default border-none shadow-none focus:ring-0"
                  )}>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned" className="text-muted-foreground italic">Unassigned</SelectItem>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Priority</h3>
                <Select
                  value={task.priority || 'MEDIUM'}
                  onValueChange={(val: any) => updateTaskDetails(task.id, { priority: val } as any)}
                  disabled={!permissions.includes('UPDATE_TASK')}
                >
                  <SelectTrigger className={cn(
                    "h-8 text-[13px] border-transparent -ml-3 transition-colors max-w-[150px]",
                    permissions.includes('UPDATE_TASK') ? "hover:border-border" : "cursor-default border-none shadow-none focus:ring-0"
                  )}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Created</h3>
                <p className="text-sm text-foreground">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}
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
                  {a.activity_type === 'STATUS_CHANGE' && <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground break-words">{a.metadata?.message || a.reference_id}</p>
                    {a.metadata?.author && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">By: {typeof a.metadata.author === 'object' ? (a.metadata.author.name || a.metadata.author.username || a.metadata.author.email) : a.metadata.author}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            {aiDecisions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bot className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm">No AI decision tracking logs found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {aiDecisions.map((decision) => (
                  <div key={decision.id} className="relative rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="absolute top-4 right-4 flex flex-col items-end">
                       <Badge variant="outline" className={cn(
                        "text-[10px] uppercase font-semibold",
                        decision.status === 'APPLIED' || decision.status === 'EXECUTED' ? 'bg-success/10 text-success border-success/20' :
                        decision.status === 'BLOCKED' ? 'bg-destructive/10 text-destructive border-destructive/20 cursor-help' : ''
                       )}>
                         {decision.status?.replace('_', ' ')}
                       </Badge>
                       <span className="text-[10px] text-muted-foreground mt-1">
                         {new Date(decision.createdAt).toLocaleString()}
                       </span>
                    </div>

                    <div className="pr-20">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">AI Assistant Decision</span>
                      </div>
                      
                      <div className="space-y-2 mt-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Reasoning Process</p>
                          <p className="text-sm mt-1">{decision.reasoning}</p>
                        </div>
                        
                        {decision.confidenceScore != null && (
                          <div className="mt-4 pt-3 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                              <span>Action Certainty</span>
                              <span>{Math.round(decision.confidenceScore * 100)}%</span>
                            </p>
                            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  decision.confidenceScore > 0.85 ? 'bg-success' : decision.confidenceScore > 0.6 ? 'bg-warning' : 'bg-destructive'
                                )}
                                style={{ width: `${decision.confidenceScore * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
