import { useMemo, useState } from 'react';
import { useWorkflowStore, type Task } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  CheckCircle2, RefreshCw, CalendarClock, PlusCircle,
  Maximize2, ArrowUpRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, subDays, addDays, isAfter, isBefore, parseISO } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

interface SummaryBoardProps {
  onNavigateToBoard: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  DONE: '#4C7EF3',
  ACTIVE: '#6ABF69',
  REVIEW: '#F5A623',
  VALIDATION: '#9B59B6',
  BACKLOG: '#C084FC',
  BLOCKED: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  DONE: 'Done',
  ACTIVE: 'In Progress',
  REVIEW: 'In Review',
  VALIDATION: 'Validation',
  BACKLOG: 'To Do',
  BLOCKED: 'Blocked',
};

const PRIORITY_CONFIG: { key: string; label: string; color: string; icon: string }[] = [
  { key: 'CRITICAL', label: 'Critical', color: '#DC2626', icon: '⬆⬆' },
  { key: 'HIGH', label: 'High', color: '#EA580C', icon: '⬆' },
  { key: 'MEDIUM', label: 'Medium', color: '#D97706', icon: '═' },
  { key: 'LOW', label: 'Low', color: '#6B7280', icon: '⬇' },
];

const AVATAR_COLORS = [
  'bg-orange-500', 'bg-blue-600', 'bg-emerald-500', 'bg-purple-500',
  'bg-pink-500', 'bg-teal-500', 'bg-amber-500', 'bg-indigo-500',
];

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email?.[0]?.toUpperCase() || '?';
}

function safeParseDate(d: string | undefined | null): Date | null {
  if (!d) return null;
  try {
    return parseISO(d);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function SummaryBoard({ onNavigateToBoard }: SummaryBoardProps) {
  const { tasks, statuses } = useWorkflowStore();
  const { members } = useProjectStore();

  const [activityExpanded, setActivityExpanded] = useState(false);

  // ── Computed metrics ────────────────────────────────────────────────────

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const sevenDaysFromNow = addDays(now, 7);

  const stats = useMemo(() => {
    let completed = 0;
    let updated = 0;
    let created = 0;
    let dueSoon = 0;

    tasks.forEach((task) => {
      const createdAt = safeParseDate(task.createdAt);
      const updatedAt = safeParseDate(task.updatedAt);

      // Completed in last 7 days
      if (task.status_category === 'DONE' && updatedAt && isAfter(updatedAt, sevenDaysAgo)) {
        completed++;
      }

      // Updated in last 7 days
      if (updatedAt && isAfter(updatedAt, sevenDaysAgo)) {
        updated++;
      }

      // Created in last 7 days
      if (createdAt && isAfter(createdAt, sevenDaysAgo)) {
        created++;
      }

      // Due soon (tasks in active sprint ending in next 7 days — approximate by non-done status)
      if (task.status_category !== 'DONE' && task.sprint_id) {
        dueSoon++;
      }
    });

    return { completed, updated, created, dueSoon: Math.min(dueSoon, tasks.filter(t => t.status_category !== 'DONE').length) };
  }, [tasks, sevenDaysAgo]);

  // ── Status distribution for donut chart ──────────────────────────────────

  const statusData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    tasks.forEach((task) => {
      const cat = task.status_category || 'BACKLOG';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    return Object.entries(categoryMap)
      .map(([key, value]) => ({
        name: STATUS_LABELS[key] || key,
        value,
        color: STATUS_COLORS[key] || '#94A3B8',
        category: key,
      }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  const totalTasks = tasks.length;

  // ── Priority breakdown for bar chart ─────────────────────────────────────

  const priorityData = useMemo(() => {
    const countByPriority: Record<string, number> = {};
    tasks.forEach((task) => {
      const p = task.priority || 'MEDIUM';
      countByPriority[p] = (countByPriority[p] || 0) + 1;
    });

    return PRIORITY_CONFIG.map(({ key, label, color, icon }) => ({
      name: label,
      count: countByPriority[key] || 0,
      fill: color,
      icon,
    }));
  }, [tasks]);

  // ── Recent activity (sorted tasks by updated_at) ─────────────────────────

  const recentActivity = useMemo(() => {
    return [...tasks]
      .filter((t) => t.updatedAt)
      .sort((a, b) => {
        const da = safeParseDate(a.updatedAt)?.getTime() || 0;
        const db = safeParseDate(b.updatedAt)?.getTime() || 0;
        return db - da;
      })
      .slice(0, activityExpanded ? 20 : 6);
  }, [tasks, activityExpanded]);

  // ── Team workload ────────────────────────────────────────────────────────

  const workload = useMemo(() => {
    const assignmentCount: Record<string, number> = {};
    let unassigned = 0;

    tasks.forEach((task) => {
      if (task.assignee_id) {
        assignmentCount[task.assignee_id] = (assignmentCount[task.assignee_id] || 0) + 1;
      } else {
        unassigned++;
      }
    });

    const entries: { id: string; name: string; email: string; count: number; percent: number; colorClass: string }[] = [];

    // Unassigned first
    if (unassigned > 0) {
      entries.push({
        id: 'unassigned',
        name: 'Unassigned',
        email: '',
        count: unassigned,
        percent: totalTasks > 0 ? Math.round((unassigned / totalTasks) * 100) : 0,
        colorClass: 'bg-slate-400',
      });
    }

    members.forEach((member, idx) => {
      const count = assignmentCount[member.id] || 0;
      if (count > 0 || members.length <= 10) {
        entries.push({
          id: member.id,
          name: member.full_name || member.email,
          email: member.email,
          count,
          percent: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0,
          colorClass: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        });
      }
    });

    // Sort by count descending (unassigned stays if it was added)
    return entries.sort((a, b) => {
      if (a.id === 'unassigned') return -1;
      if (b.id === 'unassigned') return 1;
      return b.count - a.count;
    });
  }, [tasks, members, totalTasks]);

  // ── Determine description for activity item ──────────────────────────────

  function describeActivity(task: Task): string {
    if (task.status_category === 'DONE') return 'completed';
    if (task.status_name) return `moved to ${task.status_name}`;
    return 'updated';
  }

  function getStatusBadgeStyle(category?: string): string {
    switch (category) {
      case 'DONE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
      case 'REVIEW': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'BACKLOG': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'BLOCKED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  // ── Custom donut label ───────────────────────────────────────────────────

  const renderCenterLabel = () => (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-foreground"
    >
      <tspan x="50%" dy="-0.3em" fontSize="28" fontWeight="700">{totalTasks}</tspan>
      <tspan x="50%" dy="1.6em" fontSize="11" className="fill-muted-foreground">
        Total work items
      </tspan>
    </text>
  );

  // ── Custom bar chart tooltip ─────────────────────────────────────────────

  const PriorityTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      return (
        <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
          <p className="text-sm font-medium">{payload[0].payload.name}</p>
          <p className="text-xs text-muted-foreground">{payload[0].value} task{payload[0].value !== 1 ? 's' : ''}</p>
        </div>
      );
    }
    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const statCards = [
    {
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      count: stats.completed,
      label: 'completed',
      sub: 'in the last 7 days',
    },
    {
      icon: RefreshCw,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      count: stats.updated,
      label: 'updated',
      sub: 'in the last 7 days',
    },
    {
      icon: PlusCircle,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      count: stats.created,
      label: 'created',
      sub: 'in the last 7 days',
    },
    {
      icon: CalendarClock,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      count: stats.dueSoon,
      label: 'due soon',
      sub: 'in the next 7 days',
    },
  ];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-6xl space-y-6 p-6">

        {/* ── Stat Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
            >
              <Card className="relative overflow-hidden border hover:border-primary/20 hover:shadow-sm transition-all group">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', card.iconBg)}>
                    <card.icon className={cn('h-5 w-5', card.iconColor)} />
                  </div>
                  <div>
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-foreground">{card.count}</span>
                      <span className="text-sm font-medium text-foreground">{card.label}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{card.sub}</p>
                  </div>
                </CardContent>
                {/* Subtle gradient accent */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Two-column layout: Status Overview + Recent Activity ───── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Status Overview — Donut chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Status overview</CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  Get a snapshot of the status of your work items.
                  <button
                    onClick={onNavigateToBoard}
                    className="text-primary hover:underline font-medium text-xs inline-flex items-center gap-0.5"
                  >
                    View all work items
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {totalTasks === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <p className="text-sm">No work items yet</p>
                    <p className="text-xs mt-1">Create tasks to see the status overview</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
                    {/* Donut chart */}
                    <div className="relative w-52 h-52 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={88}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          {renderCenterLabel()}
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-col gap-2.5">
                      {statusData.map((entry) => (
                        <div key={entry.category} className="flex items-center gap-2.5">
                          <div
                            className="h-3.5 w-3.5 rounded-sm shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-sm text-foreground">
                            {entry.name}: <span className="font-semibold">{entry.value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
                    <CardDescription>Stay up to date with what's happening across the space.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <p className="text-sm">No recent activity</p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="max-h-[320px] pr-2">
                      <div className="space-y-1">
                        {recentActivity.map((task, idx) => {
                          const member = members.find((m) => String(m.id) === String(task.assignee_id));
                          const initials = getInitials(member?.full_name, member?.email);
                          const colorClass = member
                            ? AVATAR_COLORS[members.indexOf(member) % AVATAR_COLORS.length]
                            : 'bg-slate-400';
                          const action = describeActivity(task);
                          const timeAgo = safeParseDate(task.updatedAt);
                          const statusLabel = STATUS_LABELS[task.status_category || 'BACKLOG'] || task.status_name || 'Unknown';

                          return (
                            <motion.div
                              key={`${task.id}-${idx}`}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors"
                            >
                              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                <AvatarFallback className={cn('text-[10px] font-semibold text-white', colorClass)}>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm leading-snug">
                                  <span className="font-medium text-primary">
                                    {member?.full_name || member?.email || 'Someone'}
                                  </span>
                                  {' '}{action}{' '}
                                  <span className="inline-flex items-center gap-1">
                                    <Badge
                                      variant="outline"
                                      className={cn('text-[10px] px-1.5 py-0', getStatusBadgeStyle(task.status_category))}
                                    >
                                      {statusLabel.toUpperCase()}
                                    </Badge>
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {task.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                                  {timeAgo ? formatDistanceToNow(timeAgo, { addSuffix: true }) : ''}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    {tasks.length > 6 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setActivityExpanded(!activityExpanded)}
                      >
                        {activityExpanded ? (
                          <>Show less <ChevronUp className="ml-1 h-3 w-3" /></>
                        ) : (
                          <>Show more <ChevronDown className="ml-1 h-3 w-3" /></>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Two-column layout: Priority Breakdown + Team Workload ──── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Priority Breakdown — Bar chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Priority breakdown</CardTitle>
                <CardDescription>
                  Get a holistic view of how work is being prioritized.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {totalTasks === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <p className="text-sm">No tasks to display</p>
                  </div>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={priorityData}
                        margin={{ top: 8, right: 8, left: -16, bottom: 4 }}
                        barCategoryGap="25%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<PriorityTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                          {priorityData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Workload — Horizontal bars */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Team workload</CardTitle>
                <CardDescription>
                  Monitor the capacity of your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workload.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <p className="text-sm">No workload data</p>
                    <p className="text-xs mt-1">Assign tasks to team members to see workload</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Assignee</span>
                      <span>Work distribution</span>
                    </div>

                    {/* Workload rows */}
                    <div className="space-y-3">
                      {workload.map((entry, idx) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.45 + idx * 0.05 }}
                          className="flex items-center gap-3"
                        >
                          {/* Avatar + name */}
                          <div className="flex items-center gap-2.5 w-40 shrink-0">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className={cn('text-[10px] font-semibold text-white', entry.colorClass)}>
                                {entry.id === 'unassigned' ? '?' : getInitials(entry.name, entry.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate text-foreground">
                              {entry.name}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="flex-1 flex items-center gap-2.5">
                            <div className="flex-1 h-7 rounded bg-muted/50 relative overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(entry.percent, entry.count > 0 ? 8 : 0)}%` }}
                                transition={{ delay: 0.5 + idx * 0.06, duration: 0.5, ease: 'easeOut' }}
                                className={cn(
                                  'h-full rounded flex items-center px-2.5',
                                  entry.id === 'unassigned' ? 'bg-slate-300' : 'bg-primary/80'
                                )}
                              >
                                <span className="text-[11px] font-semibold text-white whitespace-nowrap">
                                  {entry.percent}%
                                </span>
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
