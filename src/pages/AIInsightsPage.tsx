import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { useParams } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle,
  Flame, CheckCircle2, Clock, Users, Brain, ArrowRight, ChevronRight,
  Zap, ShieldAlert, CircleDot
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid
} from 'recharts';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH SCORE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function computeHealthScore(intel: any): {
  score: number;
  status: 'Healthy' | 'Moderate' | 'At Risk';
  color: string;
  reasons: { icon: string; text: string; bad: boolean }[];
} {
  if (!intel) return { score: 0, status: 'At Risk', color: '#ef4444', reasons: [] };

  const pred   = intel.predictive   ?? {};
  const diag   = intel.diagnostic   ?? {};
  const eff    = intel.efficiency   ?? {};
  const ai     = intel.ai_metrics   ?? {};
  const blk    = intel.blocker_intelligence ?? {};

  let score = 100;
  const reasons: { icon: string; text: string; bad: boolean }[] = [];

  // Sprint completion probability (max deduction: 30)
  const prob = pred.sprint_completion_probability ?? 0;
  if (prob < 40)  { score -= 30; reasons.push({ icon: '↓', text: 'Sprint at serious risk', bad: true }); }
  else if (prob < 70) { score -= 15; reasons.push({ icon: '↓', text: 'Sprint behind pace',      bad: true }); }
  else               { reasons.push({ icon: '✓', text: 'Sprint on track',              bad: false }); }

  // Active blockers (max deduction: 25)
  const blockers = blk.active_blockers ?? 0;
  if (blockers >= 4)  { score -= 25; reasons.push({ icon: '↑', text: `${blockers} active blockers`, bad: true }); }
  else if (blockers >= 2) { score -= 12; reasons.push({ icon: '↑', text: `${blockers} blockers open`,    bad: true }); }
  else if (blockers === 1) { score -= 5;  reasons.push({ icon: '!', text: '1 blocker open',               bad: true }); }

  // Team overload (max deduction: 20)
  const overloaded = diag.overloaded_member_count ?? 0;
  if (overloaded > 0) { score -= overloaded * 8; reasons.push({ icon: '↑', text: `${overloaded} member(s) overloaded`, bad: true }); }

  // Velocity trend (max deduction: 15)
  const vTrend = diag.velocity_trend ?? 'stable';
  if (vTrend === 'significant_drop') { score -= 15; reasons.push({ icon: '↓', text: 'Velocity dropped >20%', bad: true }); }
  else if (vTrend === 'slight_drop') { score -= 7;  reasons.push({ icon: '↓', text: 'Velocity declining',     bad: true }); }

  // Flow efficiency (max deduction: 10)
  const flow = eff.flow_efficiency_pct ?? 0;
  if (flow < 30) { score -= 10; }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Cap reasons at 3
  const topReasons = reasons.slice(0, 3);

  const status = score >= 70 ? 'Healthy' : score >= 45 ? 'Moderate' : 'At Risk';
  const color  = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';

  return { score, status, color, reasons: topReasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
      {children}
    </p>
  );
}

function Block({
  children, className, delay = 0,
}: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        'rounded-2xl border border-border/60 bg-card p-5 flex flex-col',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// Circular progress ring
function Ring({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

// Thin horizontal load bar
function LoadBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export default function AIInsightsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentTeamId, ensureDefaultTeam } = useProjectStore();
  const { fetchAIDecisions, fetchTasks, setTeamId, teamId } = useWorkflowStore();

  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [syncing, setSyncing]           = useState(false);

  const resolvedTeamId = teamId || currentTeamId;

  // ── boot ──────────────────────────────────────────────────────────────────
  const boot = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const tid = currentTeamId || (await ensureDefaultTeam(projectId));
    setTeamId(tid);
    await Promise.all([fetchTasks(), fetchAIDecisions()]);
    try {
      const data = await api.getAnalyticsIntelligence(String(tid));
      setIntelligence(data);
    } catch (e) {
      console.error('Intelligence fetch failed', e);
    }
    setLoading(false);
  }, [projectId, currentTeamId]);

  const refresh = useCallback(async () => {
    if (!resolvedTeamId) return;
    setSyncing(true);
    try {
      const data = await api.getAnalyticsIntelligence(String(resolvedTeamId));
      setIntelligence(data);
      await Promise.all([fetchTasks(), fetchAIDecisions()]);
    } finally {
      setSyncing(false);
    }
  }, [resolvedTeamId]);

  useEffect(() => { void boot(); }, [projectId, currentTeamId]);

  // ── data shortcuts ────────────────────────────────────────────────────────
  const pred       = intelligence?.predictive          ?? {};
  const diag       = intelligence?.diagnostic          ?? {};
  const presc      = intelligence?.prescriptive        ?? {};
  const blk        = intelligence?.blocker_intelligence ?? {};
  const velHistory: any[] = intelligence?.velocity_history ?? [];

  const health = useMemo(() => computeHealthScore(intelligence), [intelligence]);

  // Velocity chart data (last 5-8 sprints, show completed + active)
  const velData = useMemo(() =>
    velHistory.slice(-8).map((v: any) => ({
      name: v.sprint_name?.replace(/sprint/i, 'S').trim() ?? '?',
      done: v.velocity ?? 0,
    })),
    [velHistory]
  );

  const velTrend = useMemo(() => {
    if (velData.length < 2) return 'flat';
    const last = velData[velData.length - 1].done;
    const prev = velData[velData.length - 2].done;
    if (last > prev * 1.05) return 'up';
    if (last < prev * 0.95) return 'down';
    return 'flat';
  }, [velData]);

  // Team load (top 5 members by active task count)
  const memberLoads: any[] = useMemo(() => (diag.member_workloads ?? []).slice(0, 5), [diag]);
  const maxLoad = useMemo(() => Math.max(...memberLoads.map((m: any) => m.active_tasks), 1), [memberLoads]);

  // Top 2 prescriptive recommendations
  const topRecs: any[] = useMemo(() => (presc.recommendations ?? []).slice(0, 2), [presc]);

  // Main issue text (single line)
  const mainIssue = useMemo(() => {
    const firstInsight = (diag.insights ?? []).find((i: any) => i.bad !== false);
    if (firstInsight) return firstInsight.message?.split('.')[0] ?? '';
    if (blk.active_blockers > 0) return `${blk.active_blockers} active blocker(s) open`;
    return 'No critical issues';
  }, [diag, blk]);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <Brain className="h-10 w-10 text-primary/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Loading intelligence…</p>
        </div>
      </div>
    );
  }

  const completionPct = pred.sprint_completion_probability ?? 0;
  const tasksDone     = pred.sprint_tasks_done ?? 0;
  const tasksTotal    = pred.sprint_tasks_total ?? 0;
  const daysLeft      = pred.days_remaining_in_sprint ?? 0;
  const atRiskCount   = (pred.at_risk_tasks ?? []).length;
  const blockerCount  = blk.active_blockers ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin bg-background">

      {/* ── Slim header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-none">AI Command Dashboard</h1>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-none">Sprint intelligence · Decision engine</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-all"
        >
          <RefreshCw className={cn('h-3 w-3', syncing && 'animate-spin')} />
          Sync
        </button>
      </div>

      {/* ── 6-BLOCK GRID ──────────────────────────────────────────────────── */}
      <div className="flex-1 p-5 grid grid-rows-[auto_auto_auto] gap-4">

        {/* ROW 1: Hero Row — 3 equal columns */}
        <div className="grid grid-cols-3 gap-4">

          {/* ── BLOCK 1: Sprint Health Score ─────────────────────────────── */}
          <Block delay={0} className="relative overflow-hidden">
            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 blur-2xl"
              style={{ backgroundColor: health.color }}
            />
            <Label>Is this sprint healthy?</Label>

            <div className="flex items-start gap-4 mt-auto">
              {/* Score ring */}
              <div className="relative shrink-0">
                <Ring pct={health.score} color={health.color} size={88} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-foreground leading-none">{health.score}</span>
                  <span className="text-[9px] text-muted-foreground">/100</span>
                </div>
              </div>

              {/* Status + reasons */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-base font-black"
                    style={{ color: health.color }}
                  >
                    {health.status}
                  </span>
                  {health.status === 'Healthy'  && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {health.status === 'Moderate' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  {health.status === 'At Risk'  && <Flame className="h-4 w-4 text-red-500" />}
                </div>
                <div className="space-y-1.5">
                  {health.reasons.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className={cn(
                        'text-[10px] font-bold w-3 shrink-0',
                        r.bad ? 'text-red-400' : 'text-emerald-400'
                      )}>{r.icon}</span>
                      <span className="text-[11px] text-muted-foreground truncate">{r.text}</span>
                    </div>
                  ))}
                  {health.reasons.length === 0 && (
                    <p className="text-[11px] text-emerald-400">All metrics nominal</p>
                  )}
                </div>
              </div>
            </div>
          </Block>

          {/* ── BLOCK 2: Sprint Progress ──────────────────────────────────── */}
          <Block delay={0.07}>
            <Label>Are we on track?</Label>

            <div className="flex items-center justify-between mb-4">
              {/* Donut */}
              <div className="relative shrink-0">
                <Ring
                  pct={completionPct}
                  color={completionPct >= 70 ? '#22c55e' : completionPct >= 40 ? '#f59e0b' : '#ef4444'}
                  size={88}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-foreground leading-none">{completionPct}%</span>
                  <span className="text-[9px] text-muted-foreground">done</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 pl-4 space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground/60">Tasks</p>
                  <p className="text-lg font-black text-foreground leading-none">
                    {tasksDone}<span className="text-sm font-normal text-muted-foreground"> / {tasksTotal}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground/60">Days left</p>
                  <p className={cn(
                    'text-lg font-black leading-none',
                    daysLeft <= 2 ? 'text-red-400' : daysLeft <= 5 ? 'text-amber-400' : 'text-foreground'
                  )}>
                    {daysLeft}
                    <span className="text-sm font-normal text-muted-foreground"> days</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-auto">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                <span>Sprint progress</span>
                <span>{completionPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${completionPct}%`,
                    backgroundColor: completionPct >= 70 ? '#22c55e' : completionPct >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          </Block>

          {/* ── BLOCK 3: Velocity Trend ───────────────────────────────────── */}
          <Block delay={0.14}>
            <Label>Are we improving?</Label>

            {/* Direction badge */}
            <div className="flex items-center gap-2 mb-3">
              {velTrend === 'up'   && <><TrendingUp className="h-5 w-5 text-emerald-400" /><span className="text-sm font-bold text-emerald-400">Improving</span></>}
              {velTrend === 'down' && <><TrendingDown className="h-5 w-5 text-red-400"     /><span className="text-sm font-bold text-red-400">Declining</span></>}
              {velTrend === 'flat' && <><Minus className="h-5 w-5 text-muted-foreground"   /><span className="text-sm font-bold text-muted-foreground">Stable</span></>}
            </div>

            {/* Mini line chart */}
            <div className="flex-1 min-h-0 h-28">
              {velData.length < 2 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-muted-foreground/50">Complete a sprint to see trends</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={velData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      axisLine={false} tickLine={false}
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                        fontSize: '11px',
                        padding: '6px 10px',
                      }}
                      formatter={(v: any) => [`${v} tasks`, 'Completed']}
                    />
                    <Line
                      type="monotone" dataKey="done"
                      stroke={velTrend === 'up' ? '#22c55e' : velTrend === 'down' ? '#ef4444' : '#8B5CF6'}
                      strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--card))', strokeWidth: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Current vs predicted */}
            {velData.length >= 1 && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground/60">Current</p>
                  <p className="text-sm font-bold">{pred.current_velocity ?? velData[velData.length - 1]?.done ?? 0}</p>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground/60">Predicted</p>
                  <p className="text-sm font-bold text-primary">{pred.predicted_next_velocity ?? 0}</p>
                </div>
              </div>
            )}
          </Block>
        </div>

        {/* ROW 2: Middle Row — 2 columns */}
        <div className="grid grid-cols-2 gap-4">

          {/* ── BLOCK 4: Risk & Blockers ──────────────────────────────────── */}
          <Block delay={0.21}>
            <Label>What is slowing us down?</Label>

            {/* 3 metrics in a triptych */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* Blockers */}
              <div className={cn(
                'flex flex-col items-center justify-center rounded-xl py-3 border',
                blockerCount >= 3 ? 'bg-red-500/8 border-red-500/20' :
                  blockerCount >= 1 ? 'bg-amber-500/8 border-amber-500/20' :
                    'bg-muted/30 border-border/40'
              )}>
                <ShieldAlert className={cn('h-4 w-4 mb-1',
                  blockerCount >= 3 ? 'text-red-400' :
                    blockerCount >= 1 ? 'text-amber-400' : 'text-muted-foreground/40'
                )} />
                <span className={cn('text-2xl font-black leading-none',
                  blockerCount >= 3 ? 'text-red-400' :
                    blockerCount >= 1 ? 'text-amber-400' : 'text-muted-foreground'
                )}>{blockerCount}</span>
                <span className="text-[9px] text-muted-foreground/60 mt-0.5">Blockers</span>
              </div>

              {/* At-risk tasks */}
              <div className={cn(
                'flex flex-col items-center justify-center rounded-xl py-3 border',
                atRiskCount >= 3 ? 'bg-orange-500/8 border-orange-500/20' :
                  atRiskCount >= 1 ? 'bg-yellow-500/8 border-yellow-500/20' :
                    'bg-muted/30 border-border/40'
              )}>
                <AlertTriangle className={cn('h-4 w-4 mb-1',
                  atRiskCount >= 3 ? 'text-orange-400' :
                    atRiskCount >= 1 ? 'text-yellow-400' : 'text-muted-foreground/40'
                )} />
                <span className={cn('text-2xl font-black leading-none',
                  atRiskCount >= 3 ? 'text-orange-400' :
                    atRiskCount >= 1 ? 'text-yellow-400' : 'text-muted-foreground'
                )}>{atRiskCount}</span>
                <span className="text-[9px] text-muted-foreground/60 mt-0.5">At Risk</span>
              </div>

              {/* Overload */}
              <div className={cn(
                'flex flex-col items-center justify-center rounded-xl py-3 border',
                (diag.overloaded_member_count ?? 0) > 0 ? 'bg-rose-500/8 border-rose-500/20' : 'bg-muted/30 border-border/40'
              )}>
                <Users className={cn('h-4 w-4 mb-1',
                  (diag.overloaded_member_count ?? 0) > 0 ? 'text-rose-400' : 'text-muted-foreground/40'
                )} />
                <span className={cn('text-2xl font-black leading-none',
                  (diag.overloaded_member_count ?? 0) > 0 ? 'text-rose-400' : 'text-muted-foreground'
                )}>{diag.overloaded_member_count ?? 0}</span>
                <span className="text-[9px] text-muted-foreground/60 mt-0.5">Overloaded</span>
              </div>
            </div>

            {/* Single main issue */}
            <div className="mt-auto rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 flex items-start gap-2">
              <Flame className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Main Issue</p>
                <p className="text-xs text-foreground leading-snug truncate">{mainIssue || 'No critical issues detected'}</p>
              </div>
            </div>
          </Block>

          {/* ── BLOCK 5: Team Load Balance ────────────────────────────────── */}
          <Block delay={0.28}>
            <Label>Is workload balanced?</Label>

            {memberLoads.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground/40 gap-2">
                <Users className="h-8 w-8" />
                <p className="text-xs">No team members yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-1">
                {memberLoads.map((m: any) => {
                  const pct    = Math.round((m.active_tasks / maxLoad) * 100);
                  const isOver = m.overloaded;
                  const isIdle = m.active_tasks === 0;
                  const color  = isOver ? '#ef4444' : isIdle ? '#6b7280' : '#8B5CF6';
                  return (
                    <div key={m.member_id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Avatar */}
                          <div className={cn(
                            'h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0',
                            isOver ? 'bg-red-500' : isIdle ? 'bg-muted text-muted-foreground' : 'bg-violet-500'
                          )}>
                            {m.member_name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <span className={cn(
                            'text-xs font-medium truncate max-w-[110px]',
                            isOver ? 'text-red-400' : isIdle ? 'text-muted-foreground/50' : 'text-foreground'
                          )}>
                            {m.member_name}
                          </span>
                          {isOver && <Flame className="h-3 w-3 text-red-400 shrink-0" />}
                        </div>
                        <span className={cn(
                          'text-[10px] font-bold shrink-0 ml-1',
                          isOver ? 'text-red-400' : isIdle ? 'text-muted-foreground/40' : 'text-muted-foreground'
                        )}>
                          {m.active_tasks} task{m.active_tasks !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <LoadBar pct={isIdle ? 4 : pct} color={color} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-[9px] text-muted-foreground/60">Overloaded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-[9px] text-muted-foreground/60">Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
                <span className="text-[9px] text-muted-foreground/60">Idle</span>
              </div>
            </div>
          </Block>
        </div>

        {/* ROW 3: Full-width — AI Recommendation */}

        {/* ── BLOCK 6: AI Recommendation ───────────────────────────────────── */}
        <Block delay={0.35} className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-violet-500/5">
          <Label>What should we do next?</Label>

          {topRecs.length === 0 ? (
            <div className="flex items-center gap-3 py-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="text-sm font-medium text-muted-foreground">
                All metrics look good. Maintain current sprint cadence.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topRecs.map((rec: any, i: number) => {
                const severityColor =
                  rec.severity === 'CRITICAL' ? 'border-red-500/30 bg-red-500/5'  :
                  rec.severity === 'HIGH'     ? 'border-orange-500/30 bg-orange-500/5' :
                                               'border-primary/20 bg-primary/5';
                const dotColor =
                  rec.severity === 'CRITICAL' ? '#ef4444' :
                  rec.severity === 'HIGH'     ? '#f97316' : '#8B5CF6';

                return (
                  <div
                    key={rec.id ?? i}
                    className={cn('flex items-start gap-3 rounded-xl border p-4', severityColor)}
                  >
                    {/* Priority dot */}
                    <div className="shrink-0 mt-0.5">
                      <CircleDot className="h-4 w-4" style={{ color: dotColor }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Severity + category */}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[9px] font-black uppercase tracking-widest"
                          style={{ color: dotColor }}
                        >
                          {rec.severity}
                        </span>
                        <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                          {rec.category}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-bold text-foreground leading-snug">{rec.title}</p>

                      {/* Action — SHORT, one line */}
                      <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">{rec.action}</p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                  </div>
                );
              })}
            </div>
          )}
        </Block>

      </div>
    </div>
  );
}
