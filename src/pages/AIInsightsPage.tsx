import { useEffect, useMemo, useState } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { useParams } from 'react-router-dom';
import { AIDecisionCard } from '@/components/ai/AIDecisionCard';
import { Bot, RefreshCw, BarChart2, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PIE_COLORS = ['#8B5CF6', '#10B981']; // Purple (AI), Emerald (Manual)

function formatRelativeTime(dateString: string) {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export default function AIInsightsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentTeamId, ensureDefaultTeam } = useProjectStore();
  const { tasks, aiDecisions, fetchAIDecisions, fetchTasks, setTeamId } = useWorkflowStore();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const boot = async () => {
      if (!projectId) return;
      const teamId = currentTeamId || (await ensureDefaultTeam(projectId));
      setTeamId(teamId);
      await fetchTasks();
      await fetchAIDecisions();
      try {
        const evts = await api.getEventLog(String(teamId), 100);
        setEvents(evts);
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
    };
    void boot();
  }, [projectId, currentTeamId, ensureDefaultTeam, setTeamId, fetchTasks, fetchAIDecisions]);

  // Analytics Math
  const { autonomyData, activityData, blockers, successfulDecisions } = useMemo(() => {
    const executed = aiDecisions.filter(d => d.status === 'APPLIED' || d.status === 'EXECUTED');
    const blocksAndPending = aiDecisions.filter(d => d.status === 'BLOCKED' || d.status === 'PENDING_APPROVAL' || d.status === 'PENDING_CONFIRMATION');
    
    // AI vs Manual approximate: Count AI executions vs total tasks moved
    const aiMoves = executed.length;
    const manualMoves = Math.max(0, tasks.filter(t => t.status_category === 'DONE' || t.status_category === 'ACTIVE').length - aiMoves);
    
    // Monthly/Weekly activity trend (Mock aggregated logic)
    const trends = [
      { name: 'Week 1', ai: 4, manual: 12 },
      { name: 'Week 2', ai: 7, manual: 9 },
      { name: 'Week 3', ai: 15, manual: 5 },
      { name: 'Week 4', ai: Math.max(aiMoves, 1), manual: Math.max(manualMoves, 1) }
    ];

    return {
      autonomyData: [
        { name: 'AI Driven', value: Math.max(aiMoves, 1) },
        { name: 'Manual', value: Math.max(manualMoves, 1) }
      ],
      activityData: trends,
      blockers: blocksAndPending,
      successfulDecisions: executed
    };
  }, [aiDecisions, tasks]);

  return (
    <div className="flex h-full flex-col overflow-y-auto w-full scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-8 py-6 shrink-0 bg-card">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI Intelligence Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze agent velocity and resolve complex workflow blocked paths.
          </p>
        </div>
        <Button variant="outline" onClick={() => { fetchAIDecisions(); fetchTasks(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Data
        </Button>
      </div>

      <div className="p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
        {/* Top Analytics */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cpu className="h-5 w-5 text-primary" />
                  Agent Autonomy Factor
                </CardTitle>
                <CardDescription>Ratio of task transitions executed autonomously vs manual human intervention.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-8 h-64">
                <div className="w-1/2 h-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={autonomyData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {autonomyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-4">
                  {autonomyData.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.name}</p>
                        <p className="text-2xl font-bold">{entry.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  Transition Velocity Trends
                </CardTitle>
                <CardDescription>Historical breakdown of task throughput over the last sprint cycles.</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--accent))' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    />
                    <Bar dataKey="ai" name="AI Decisions" stackId="a" fill="#8B5CF6" radius={[0, 0, 4, 4]} maxBarSize={40} />
                    <Bar dataKey="manual" name="Manual Updates" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </section>


        
        
        {/* Successful decisions feed logic could naturally follow down here */}
        <section className="mt-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-primary" />
            Project Event Stream
          </h2>
          
          <Card className="shadow-none border-border bg-card/60 rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[400px] overflow-y-auto scrollbar-thin p-6">
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Activity className="mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No events recorded yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">AI actions and team activity will appear here in real-time</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-border group-last:bottom-auto" />
                    <div className="space-y-1">
                      {events.map((event: any, idx: number) => {
                        const isAI = ['AI_DECISION', 'TASK_MOVED', 'AUTO_TRANSITION', 'BLOCKER_DETECTED'].includes(event.event_type);
                        const isGit = ['GIT_COMMIT', 'PR_CREATED', 'PR_MERGED', 'CI_STATUS'].includes(event.event_type);
                        return (
                          <div key={event.id || idx} className="relative flex items-start gap-4 pl-10 py-3 group">
                            {/* Timeline dot */}
                            <div className={cn(
                              'absolute left-[14px] top-4 h-3 w-3 rounded-full border-2 border-background z-10 transition-transform group-hover:scale-125',
                              isAI ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]' :
                              isGit ? 'bg-emerald-500' :
                              'bg-muted-foreground/40'
                            )} />
                            <div className="flex-1 rounded-lg border border-border/50 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <Badge variant="outline" className={cn(
                                  'text-[9px] font-bold uppercase tracking-wider border-none px-2 py-0.5 rounded-full shrink-0',
                                  isAI ? 'bg-primary/10 text-primary' :
                                  isGit ? 'bg-emerald-500/10 text-emerald-500' :
                                  'bg-muted text-muted-foreground'
                                )}>
                                  {isAI ? '🤖 AI' : isGit ? '🔗 GitHub' : '👤 Manual'}
                                </Badge>
                                <Badge variant="secondary" className="text-[9px] bg-secondary/50 text-secondary-foreground shrink-0">
                                  {event.event_type?.replace(/_/g, ' ')}
                                </Badge>
                                <span className="ml-auto text-[10px] text-muted-foreground/70 shrink-0">
                                  {formatRelativeTime(event.created_at || event.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">
                                {event.metadata?.message || event.metadata?.description || event.event_type}
                              </p>
                              {event.task_id && (
                                <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                                  Task #{event.task_id}
                                  {event.metadata?.confidence_score && (
                                    <span className="ml-2 text-primary font-medium">
                                      Confidence: {Math.round(event.metadata.confidence_score * 100)}%
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
