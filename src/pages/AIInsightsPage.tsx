import { useEffect, useMemo, useState } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { useParams } from 'react-router-dom';
import { Bot, RefreshCw, Activity, Cpu, TrendingUp, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PIE_COLORS = ['#8B5CF6', '#10B981'];

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      if (!projectId) return;
      setLoading(true);
      const teamId = currentTeamId || (await ensureDefaultTeam(projectId));
      setTeamId(teamId);
      await Promise.all([fetchTasks(), fetchAIDecisions()]);
      try {
        const evts = await api.getEventLog(String(teamId), 100);
        setEvents(evts);
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
      setLoading(false);
    };
    void boot();
  }, [projectId, currentTeamId]);

  const { autonomyData, blockers, successRate } = useMemo(() => {
    const executed = aiDecisions.filter(d => d.status === 'APPLIED' || d.status === 'EXECUTED');
    const blocksAndPending = aiDecisions.filter(d => d.status === 'BLOCKED' || d.status === 'PENDING_APPROVAL' || d.status === 'PENDING_CONFIRMATION');
    
    const aiMoves = executed.length;
    const manualMoves = Math.max(0, tasks.filter(t => t.status_category === 'DONE' || t.status_category === 'ACTIVE').length - aiMoves);
    const total = aiDecisions.length || 1;
    
    return {
      autonomyData: [
        { name: 'AI Driven', value: Math.max(aiMoves, 0) },
        { name: 'Manual', value: Math.max(manualMoves, 0) }
      ],
      blockers: blocksAndPending,
      successRate: Math.round((executed.length / total) * 100),
    };
  }, [aiDecisions, tasks]);

  // Build activity data from real events
  const activityData = useMemo(() => {
    if (events.length === 0) return [];
    const buckets: Record<string, { ai: number; manual: number; github: number }> = {};
    events.forEach(evt => {
      const date = new Date(evt.created_at || evt.timestamp);
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!buckets[key]) buckets[key] = { ai: 0, manual: 0, github: 0 };
      const isAI = ['AI_DECISION', 'TASK_MOVED', 'AUTO_TRANSITION', 'BLOCKER_DETECTED'].includes(evt.event_type);
      const isGit = ['GIT_COMMIT', 'PR_CREATED', 'PR_MERGED', 'CI_STATUS'].includes(evt.event_type);
      if (isAI) buckets[key].ai++;
      else if (isGit) buckets[key].github++;
      else buckets[key].manual++;
    });
    return Object.entries(buckets).slice(-7).map(([name, data]) => ({ name, ...data }));
  }, [events]);

  const summaryStats = [
    { label: 'Total Decisions', value: aiDecisions.length, icon: Bot, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Active Blockers', value: blockers.length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Events Tracked', value: events.length, icon: Zap, color: 'text-warning', bg: 'bg-warning/10' },
  ];

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
            Real-time analysis of agent velocity, autonomy metrics, and workflow patterns.
          </p>
        </div>
        <Button variant="outline" onClick={() => { fetchAIDecisions(); fetchTasks(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Data
        </Button>
      </div>

      <div className="p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="border hover:border-primary/20 hover:shadow-sm transition-all">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', stat.bg)}>
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cpu className="h-5 w-5 text-primary" />
                  Agent Autonomy Factor
                </CardTitle>
                <CardDescription>AI-driven vs manual task transitions</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {autonomyData[0].value === 0 && autonomyData[1].value === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Cpu className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">No transition data yet</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-8 h-full">
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={autonomyData}
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {autonomyData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} />
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
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-success" />
                  Activity Breakdown
                </CardTitle>
                <CardDescription>Event distribution by source over recent days</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {activityData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">No activity data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--accent))' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                      />
                      <Legend iconType="circle" iconSize={8} />
                      <Bar dataKey="ai" name="AI" stackId="a" fill="#8B5CF6" radius={[0, 0, 4, 4]} maxBarSize={36} />
                      <Bar dataKey="github" name="GitHub" stackId="a" fill="#10B981" maxBarSize={36} />
                      <Bar dataKey="manual" name="Manual" stackId="a" fill="#6B7280" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Event Stream */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-primary" />
                Project Event Stream
              </CardTitle>
              <CardDescription>Real-time log of all AI actions, GitHub events, and team activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Activity className="mb-3 h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">No events recorded yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">AI actions and team activity will appear here in real-time</p>
                  </div>
                ) : (
                  <div className="relative pl-6">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-0.5">
                      {events.map((event: any, idx: number) => {
                        const isAI = ['AI_DECISION', 'TASK_MOVED', 'AUTO_TRANSITION', 'BLOCKER_DETECTED'].includes(event.event_type);
                        const isGit = ['GIT_COMMIT', 'PR_CREATED', 'PR_MERGED', 'CI_STATUS'].includes(event.event_type);
                        return (
                          <div key={event.id || idx} className="relative flex items-start gap-4 py-3 group">
                            <div className={cn(
                              'absolute left-[-13px] top-[18px] h-2.5 w-2.5 rounded-full border-2 border-background z-10',
                              isAI ? 'bg-primary' : isGit ? 'bg-success' : 'bg-muted-foreground/40'
                            )} />
                            <div className="flex-1 rounded-lg border border-border/50 bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className={cn(
                                  'text-[9px] font-bold uppercase tracking-wider border-none px-2 py-0.5 rounded-full',
                                  isAI ? 'bg-primary/10 text-primary' :
                                  isGit ? 'bg-success/10 text-success' :
                                  'bg-muted text-muted-foreground'
                                )}>
                                  {isAI ? '🤖 AI' : isGit ? '🔗 GitHub' : '👤 Manual'}
                                </Badge>
                                <Badge variant="secondary" className="text-[9px] bg-secondary/50">
                                  {event.event_type?.replace(/_/g, ' ')}
                                </Badge>
                                <span className="ml-auto text-[10px] text-muted-foreground/60">
                                  {formatRelativeTime(event.created_at || event.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">
                                {event.metadata?.message || event.metadata?.description || event.event_type}
                              </p>
                              {event.task_id && (
                                <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
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
        </motion.div>
      </div>
    </div>
  );
}
