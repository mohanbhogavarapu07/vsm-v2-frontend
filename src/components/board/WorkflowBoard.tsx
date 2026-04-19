import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { KanbanColumn } from './KanbanColumn';
import { BacklogView } from './BacklogView';
import { TaskDetailPanel } from './TaskDetailPanel';
import { CompleteSprintModal } from './SprintModals';
import { SummaryBoard } from './SummaryBoard';
import AIInsightsPage from '@/pages/AIInsightsPage';
import {
  Loader2, AlertCircle, RefreshCw, Search, Plus, MoreHorizontal,
  Layout, Code2, Presentation, Calendar, Share2, Zap, CheckCircle2, Users,
  Activity, Bot, Shield, Github, GitBranch, ExternalLink, Mail, UserPlus, UserMinus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIDecisionCard } from '@/components/ai/AIDecisionCard';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { InviteMemberModal } from './InviteMemberModal';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function WorkflowBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, currentTeamId, permissions, teams, fetchTeams } = useProjectStore();
  const {
    statuses, tasks, sprints, loading, error, selectedTaskId,
    fetchWorkflows, fetchTasks, fetchSprints, updateTaskStatus, setSelectedTask, setTeamId,
  } = useWorkflowStore();

  const navigate = useNavigate();
  const location = useLocation();
  const [currentTab, setCurrentTab] = useState<'summary' | 'backlog' | 'board' | 'code' | 'activity' | 'decisions' | 'team'>('board');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [boardSearch, setBoardSearch] = useState('');
  const [codeSearch, setCodeSearch] = useState('');

  // Activity & Decisions state
  const [events, setEvents] = useState<any[]>([]);
  const { aiDecisions, fetchAIDecisions } = useWorkflowStore();
  const { 
    members, fetchMembers, roles, fetchRoles, 
    updateMemberRole, removeMember 
  } = useProjectStore();
  
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // GitHub Integration State
  const [linkedRepos, setLinkedRepos] = useState<any[]>([]);
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGitHubCallbackProcessing, setIsGitHubCallbackProcessing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [linkingRepo, setLinkingRepo] = useState<number | null>(null);

  // ── Real-time sync layer ──────────────────────────────────────────
  useRealtimeSync(currentTeamId, projectId || null);

  const activeSprints = sprints.filter((s) => s.status === 'ACTIVE');
  const plannedSprints = sprints.filter((s) => s.status === 'PLANNED');

  const [viewedSprintId, setViewedSprintId] = useState<string | null>(null);

  useEffect(() => {
    if (!viewedSprintId && activeSprints.length > 0) {
      setViewedSprintId(activeSprints[0].id);
    } else if (activeSprints.length === 0) {
      setViewedSprintId(null);
    } else if (viewedSprintId && !activeSprints.some(s => s.id === viewedSprintId)) {
      setViewedSprintId(activeSprints[0].id);
    }
  }, [activeSprints, viewedSprintId]);

  const activeSprint = activeSprints.find((s) => s.id === viewedSprintId) || activeSprints[0];

  // Tasks in the active sprint (for kanban board view)
  const activeSprintTasks = useMemo(() => {
    const sprintTasks = activeSprint
      ? tasks.filter((t) => String(t.sprint_id) === String(activeSprint.id))
      : tasks;
    if (!boardSearch.trim()) return sprintTasks;
    return sprintTasks.filter((t) => t.title.toLowerCase().includes(boardSearch.toLowerCase()));
  }, [activeSprint, tasks, boardSearch]);

  const incompleteTasks = (activeSprint
    ? tasks.filter((t) => String(t.sprint_id) === String(activeSprint.id))
    : tasks
  ).filter((t) => t.status_category !== 'DONE').length;

  const loadGitHubData = async (teamId: string) => {
    setLoadingRepos(true);
    try {
      const promises: [Promise<any[]>, Promise<any[]> | null] = [
        api.getTeamGitHubRepositories(teamId),
        permissions.includes('MANAGE_TEAM') ? api.listGitHubRepositories(teamId) : Promise.resolve([])
      ];
      
      const [linked, available] = await Promise.all(promises);
      const avail = (available || []).filter((r: any) => !r.teamId);
      setLinkedRepos(linked || []);
      setAvailableRepos(avail);
      return { linked: linked || [], available: avail };
    } catch (err) {
      console.error('Failed to load GitHub data', err);
      return { linked: [], available: [] };
    } finally {
      setLoadingRepos(false);
    }
  };

  const fetchEvents = async (teamId: string) => {
    try {
      const data = await api.getEventLog(teamId);
      setEvents(data || []);
    } catch {
      setEvents([]);
    }
  };

  // ── Initial boot: fetch core data once when project/team changes ──────
  useEffect(() => {
    const boot = async () => {
      if (!projectId) return;

      let teamId = currentTeamId;
      if (!teamId && projectId) {
         if (teams.length === 0) {
           await fetchTeams(projectId);
         }
         const loadedTeams = useProjectStore.getState().teams;
         if (loadedTeams.length > 0) {
            teamId = loadedTeams[0].id;
         }
      }
      
      // Handle GitHub redirection status
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('status') === 'github_success') {
        toast.success('GitHub App installed! Syncing repositories...');
        setCurrentTab('code');
        
        const runPolling = async () => {
          setIsGitHubCallbackProcessing(true);
          try {
            for (let i = 0; i < 5; i++) {
              const { linked, available } = await loadGitHubData(teamId);
              if (linked.length > 0 || available.length > 0) break;
              await new Promise(r => setTimeout(r, 2500));
            }
          } finally {
            setIsGitHubCallbackProcessing(false);
          }
        };
        runPolling();
        
        const newUrl = window.location.pathname + (teamId ? `?team_id=${teamId}` : '');
        window.history.replaceState({}, document.title, newUrl);
      } else if (urlParams.get('status') === 'github_error') {
        toast.error('Failed to complete GitHub installation.');
        const newUrl = window.location.pathname + (teamId ? `?team_id=${teamId}` : '');
        window.history.replaceState({}, document.title, newUrl);
      }

      setTeamId(teamId);
      
      // Fetch core data that all tabs need
      await Promise.all([
        fetchWorkflows(projectId),
        fetchTasks(),
        fetchSprints(),
        fetchMembers(projectId),
      ]);
    };
    void boot();
  }, [projectId, currentTeamId]);

  // ── Tab-specific data fetching (only when tab changes) ──────────────
  useEffect(() => {
    if (!projectId || !currentTeamId) return;
    
    if (currentTab === 'activity') {
      // AIInsights handles its own fetching now
    } else if (currentTab === 'decisions') {
      fetchAIDecisions();
    } else if (currentTab === 'team') {
      fetchRoles(projectId);
    } else if (currentTab === 'code') {
      loadGitHubData(currentTeamId);
    }
  }, [currentTab, projectId, currentTeamId]);

  // Handle precise Jira-like URL synchronization
  useEffect(() => {
    if (location.pathname.includes('/backlog')) {
      if (currentTab !== 'backlog') setCurrentTab('backlog');
    } else if (location.pathname.includes('/board')) {
      if (currentTab !== 'board') setCurrentTab('board');
    }

    const taskMatch = location.pathname.match(/\/task\/(vsm-\d+|\d+)/i);
    if (taskMatch) {
      if (selectedTaskId !== taskMatch[1]) {
         setSelectedTask(taskMatch[1]);
      }
    } else {
      if (selectedTaskId) {
         setSelectedTask(null);
      }
    }
  }, [location.pathname]);

  const handleTabChange = (tab: typeof currentTab) => {
    setCurrentTab(tab);
    if (tab === 'backlog') {
       navigate(`/projects/${projectId}/teams/${currentTeamId}/backlog`);
    } else if (tab === 'board') {
       navigate(`/projects/${projectId}/teams/${currentTeamId}/board`);
    }
  };

  const handleConnectGitHub = async (newTab = false) => {
    setIsConnecting(true);
    try {
      const { url } = await api.getGitHubInstallUrl(currentTeamId || undefined, window.location.href);
      if (newTab) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = url;
      }
    } catch (err) {
      toast.error('Failed to get installation URL');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncRepos = async () => {
    if (!currentTeamId) return;
    setSyncing(true);
    try {
      const data = await api.syncGitHubRepositories(currentTeamId);
      toast.success(data.message || 'Repositories synced');
      await loadGitHubData(currentTeamId);
    } catch (err) {
      toast.error('Failed to sync repositories');
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkRepo = async (repoId: number) => {
    if (!currentTeamId) return;
    setLinkingRepo(repoId);
    try {
      await api.linkGitHubRepository(currentTeamId, repoId);
      toast.success('Repository linked successfully');
      await loadGitHubData(currentTeamId);
    } catch (err) {
      toast.error('Failed to link repository');
    } finally {
      setLinkingRepo(null);
    }
  };

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    if (!permissions.includes('UPDATE_TASK')) {
      toast.error('You do not have permission to update tasks (Read-only access)');
      return;
    }
    const { draggableId, destination } = result;
    if (result.source.droppableId !== destination.droppableId) {
      updateTaskStatus(draggableId, destination.droppableId);
    }
  }, [permissions, updateTaskStatus]);

  const sortedStatuses = useMemo(() => [...statuses].sort((a, b) => a.positionOrder - b.positionOrder), [statuses]);

  if (loading && statuses.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && statuses.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { if (projectId) fetchWorkflows(projectId); fetchTasks(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col border-b border-border/50 bg-background pt-2 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] z-10 relative">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between px-6 py-1.5">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Projects</span>
            <span>/</span>
            <span className="font-medium text-foreground">
              {currentProject?.name || 'Current Project'}
            </span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground">
            <Zap className="mr-1 h-3.5 w-3.5 text-warning" />
            Premium trial
          </Button>
        </div>

        {/* Title + actions */}
        <div className="flex items-center justify-between px-6 mb-3 mt-1">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-orange-100 text-orange-600">
                  <Users className="h-4 w-4" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">
                  {teams.find(t => t.id === currentTeamId)?.name || 'Team'}
                </h1>
                <span className="text-muted-foreground mx-1">/</span>
                <h2 className="text-xl font-normal text-muted-foreground">
                  {currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}
                  {currentTab === 'board' && activeSprint ? ` — ${activeSprint.name}` : ''}
                </h2>
              </div>
              {activeSprint?.goal && currentTab === 'board' && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">{activeSprint.goal}</p>
              )}
            </div>
            {currentTab === 'board' && activeSprints.length > 1 && (
              <Select value={viewedSprintId || undefined} onValueChange={setViewedSprintId}>
                <SelectTrigger className="h-8 w-48 text-sm">
                  <SelectValue placeholder="Select Sprint" />
                </SelectTrigger>
                <SelectContent>
                  {activeSprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5 mr-1">
              <div className="h-7 w-7 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center ring-2 ring-background">AI</div>
            </div>

            {/* Complete Sprint — only visible in Board tab and when active sprint exists */}
            {currentTab === 'board' && activeSprint && permissions.includes('MANAGE_TEAM') && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-sm border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                onClick={() => setShowCompleteModal(true)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Complete sprint
              </Button>
            )}

            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pb-2 pt-1">
          {[
            { id: 'summary', label: 'Summary', icon: Presentation },
            { id: 'backlog', label: 'Backlog', icon: Calendar },
            { id: 'board', label: 'Board', icon: Layout },
            { id: 'code', label: 'Code', icon: Code2 },
            { id: 'activity', label: 'AI Activity', icon: Activity },
            { id: 'decisions', label: 'AI Decisions', icon: Bot },
            { id: 'team', label: 'Team', icon: Users },
          ].map(({ id, label, icon: Icon }) => {
            const isActivity = id === 'activity';

            return (
              <Button
                key={id}
                variant="ghost"
                onClick={() => setCurrentTab(id as any)}
                className={cn(
                  'h-8 px-3.5 rounded-full transition-all text-sm font-medium relative',
                  currentTab === id
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon className="mr-1.5 h-4 w-4" />
                {label}
              </Button>
            );
          })}
          {permissions.includes('MANAGE_TEAM') && (
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 text-muted-foreground rounded-full hover:bg-muted/60">
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1" />
          {permissions.includes('MANAGE_TEAM') && (
            <Button variant="outline" size="sm" className="h-8 shadow-sm mr-6" onClick={() => setShowInviteModal(true)}>
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Invite Team Members
            </Button>
          )}
        </div>
      </div>

      {/* ── Per-tab search sub-bar (Board & Code only) ──────────────────── */}
      {(currentTab === 'board' || currentTab === 'code') && (
        <div className="flex items-center gap-4 px-6 py-2.5 bg-muted/10 border-b border-border/50">
          {/* Search */}
          <div className="relative w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={currentTab === 'board' ? 'Search Board' : 'Search repositories'}
              value={currentTab === 'board' ? boardSearch : codeSearch}
              onChange={(e) => currentTab === 'board' ? setBoardSearch(e.target.value) : setCodeSearch(e.target.value)}
              className="h-8 pl-9 bg-card border-border/60 text-xs rounded-full"
            />
          </div>


          {/* Member avatars */}
          <div className="flex -space-x-2">
            <div
              title="Unassigned"
              className="h-7 w-7 rounded-full border-2 border-background border-dashed border-muted-foreground/40 flex items-center justify-center bg-muted/40 cursor-pointer hover:scale-110 transition-transform z-10"
            >
              <UserPlus className="h-3 w-3 text-muted-foreground/60" />
            </div>
            {members.map((member, i) => {
              const initials = member.full_name
                ? member.full_name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
                : member.email.substring(0, 2).toUpperCase();
              const colors = [
                'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
                'bg-violet-500', 'bg-cyan-500', 'bg-rose-500', 'bg-emerald-500',
              ];
              const color = colors[i % colors.length];
              return (
                <div
                  key={member.id}
                  title={member.full_name || member.email}
                  className={`h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white cursor-pointer hover:scale-110 transition-transform select-none ${color}`}
                  style={{ zIndex: 10 + i }}
                >
                  {initials}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
        {currentTab === 'board' ? (
          <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="h-full overflow-x-auto p-6 bg-transparent">
            {!activeSprint && sprints.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60%] gap-3 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No active sprint</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Go to the <strong>Backlog</strong> tab to create a sprint and start planning.
                </p>
                <Button size="sm" variant="outline" onClick={() => setCurrentTab('backlog')}>
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Go to Backlog
                </Button>
              </div>
            )}
            {!activeSprint && sprints.length > 0 && (
              <div className="flex flex-col items-center justify-center h-[60%] gap-3 text-center">
                <Layout className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No active sprint</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Start a sprint from the <strong>Backlog</strong> tab to see the board.
                </p>
                <Button size="sm" variant="outline" onClick={() => setCurrentTab('backlog')}>
                  Go to Backlog
                </Button>
              </div>
            )}
            {activeSprint && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-4 items-start" style={{ minHeight: 'calc(100vh - 200px)' }}>
                  {sortedStatuses.map((status) => {
                    const columnTasks = activeSprintTasks.filter((t) => t.status_id === status.id);
                    return (
                      <KanbanColumn
                        key={status.id}
                        status={status}
                        tasks={columnTasks}
                      />
                    );
                  })}
                </div>
              </DragDropContext>
            )}
          </motion.div>
        ) : currentTab === 'backlog' ? (
          <motion.div key="backlog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="h-full">
            <BacklogView />
          </motion.div>
        ) : currentTab === 'summary' ? (
          <SummaryBoard onNavigateToBoard={() => setCurrentTab('board')} />
        ) : currentTab === 'activity' ? (
          <AIInsightsPage />
        ) : currentTab === 'decisions' ? (
          <div className="h-full overflow-y-auto p-6 scrollbar-thin max-w-4xl mx-auto">
            {(!aiDecisions || aiDecisions.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Bot className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground">No AI decisions yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">
                  AI decisions will appear here as the agent processes task transitions and workflow events.
                </p>
              </div>
            ) : (
              <div className="space-y-6">


                {/* Decision History */}
                {(() => {
                  const history = aiDecisions.filter(d => !['BLOCKED', 'PENDING_APPROVAL', 'PENDING_CONFIRMATION'].includes(d.status));
                  if (history.length === 0) return (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Bot className="mb-3 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-foreground">No historical decisions</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">
                        Active blockers are awaiting your review in the Notification Center. History will populate once they are resolved.
                      </p>
                    </div>
                  );
                  return (
                    <div>
                      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                        Decision History ({history.length})
                      </h2>
                      <div className="space-y-3">
                        {history.map((d) => (
                          <AIDecisionCard key={d.id} decision={d} onAction={fetchAIDecisions} />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : currentTab === 'team' ? (
          <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="max-w-4xl mx-auto p-6 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">Team Management</h3>
                <p className="text-sm text-muted-foreground">Manage members and their roles for this team</p>
              </div>

              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-muted/50 bg-muted/5">
                  <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
                  <p className="text-base font-medium text-muted-foreground">No team members found</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Invite your colleagues to start collaborating</p>
                </div>
              ) : (
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.05 } }
                  }}
                  className="grid gap-3"
                >
                  {members.map((member, i) => {
                    const memberRole = roles.find((r) => r.id === member.role_id);
                    const initials = member.full_name
                      ? member.full_name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
                      : member.email.substring(0, 2).toUpperCase();
                    
                    const avatarColors = [
                      'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
                      'bg-violet-500', 'bg-cyan-500', 'bg-rose-500', 'bg-emerald-500',
                    ];
                    const colorIndex = i % avatarColors.length;
                    
                    return (
                      <motion.div
                        key={member.id}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full text-white text-sm font-bold shadow-sm ring-4 ring-background transition-transform duration-200 group-hover:scale-105",
                            avatarColors[colorIndex]
                          )}>
                            {initials}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {member.full_name || member.email.split('@')[0]}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="h-3 w-3 text-muted-foreground/60" />
                              <p className="text-xs text-muted-foreground font-medium">{member.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className="hidden sm:flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-secondary/30 text-secondary-foreground border-none"
                          >
                            {memberRole?.name || 'Member'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border-none',
                              member.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                            )}
                          >
                            {member.status}
                          </Badge>
                          
                          {permissions.includes('MANAGE_TEAM') && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 p-1.5">
                                <div className="px-2 py-1.5 mb-1">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manage Permission</p>
                                </div>
                                {roles.map((r) => (
                                  <DropdownMenuItem
                                    key={r.id}
                                    onClick={() => projectId && updateMemberRole(projectId, member.id, r.id)}
                                    className={cn(
                                      "flex items-center gap-2.5 py-2 cursor-pointer transition-colors",
                                      member.role_id === r.id ? 'bg-primary/5 text-primary font-semibold' : 'hover:bg-accent'
                                    )}
                                  >
                                    <Shield className={cn("h-4 w-4", member.role_id === r.id ? "text-primary" : "text-muted-foreground/60")} />
                                    <span>Set as {r.name}</span>
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator className="my-1.5" />
                                <DropdownMenuItem
                                  className="flex items-center gap-2.5 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                  onClick={() => setMemberToRemove(member.id)}
                                >
                                  <UserMinus className="h-4 w-4" />
                                  <span>Remove from Team</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        ) : currentTab === 'code' ? (
          <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
            {isGitHubCallbackProcessing ? (
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#24292e] text-white shadow-lg mb-6">
                  <Github className="h-8 w-8 animate-pulse text-white/90" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Syncing your Account...</h2>
                <p className="text-sm text-muted-foreground mb-8">
                  We are securely importing your available GitHub repositories. This usually takes just a few seconds.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing installation...
                </div>
              </div>
            ) : loadingRepos ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Syncing repository data...</p>
              </div>
            ) : availableRepos.length === 0 && linkedRepos.length === 0 ? (
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#24292e] text-white shadow-lg mb-6">
                  <Github className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Connect GitHub</h2>
                <p className="text-sm text-muted-foreground mb-8">
                  Install our GitHub App on your account or organization to allow VSM to track commits, pull requests, and branch activities for this team.
                </p>
                <Button size="lg" className="w-full gap-2 shadow-sm" onClick={() => handleConnectGitHub(false)} disabled={isConnecting}>
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Connect GitHub Integration
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className={linkedRepos.length > 0 ? "" : "md:col-span-2 max-w-2xl"}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-primary" />
                    Linked Repositories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {linkedRepos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No repositories linked</p>
                  ) : (
                    linkedRepos
                      .filter((repo) => !codeSearch || repo.fullName?.toLowerCase().includes(codeSearch.toLowerCase()))
                      .map((repo) => (
                        <div key={repo.id} className="flex items-center justify-between rounded-lg border p-3 mb-2">
                          <span className="text-sm font-medium">{repo.fullName}</span>
                          <Badge variant="outline" className="text-[10px] text-success border-success/30">Active</Badge>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>
            
            {permissions.includes('MANAGE_TEAM') && (
              <Card className={availableRepos.length > 0 && linkedRepos.length > 0 ? "md:col-span-2" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Available Repositories</CardTitle>
                      <CardDescription>Select a repository to link with this team.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="default" size="sm" onClick={() => handleConnectGitHub(true)} title="Manage GitHub App installations">
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        Manage Installations
                      </Button>
                      {loadingRepos && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {availableRepos.length === 0 ? (
                    <div className="text-center py-6 bg-muted/10 rounded-lg border border-dashed flex flex-col items-center">
                      <p className="text-sm text-muted-foreground mb-4">No available repositories found.</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2" 
                        onClick={() => currentTeamId && loadGitHubData(currentTeamId)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh Status
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {availableRepos.map((repo) => (
                        <div key={repo.id} className="flex items-center justify-between rounded-lg border p-3 bg-card hover:border-primary/30 transition-colors">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-medium truncate">{repo.fullName || repo.name}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-7 px-2 text-[10px]" 
                            disabled={linkingRepo === repo.id}
                            onClick={() => handleLinkRepo(repo.id)}
                          >
                            {linkingRepo === repo.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Link'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    ) : null}
        </AnimatePresence>
      </div>

      {/* ── Task Detail Panel ────────────────────────────────────────────── */}
      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* ── Complete Sprint Modal (from header button) ───────────────────── */}
      {showCompleteModal && activeSprint && (
        <CompleteSprintModal
          sprint={activeSprint}
          incompleteTasks={incompleteTasks}
          plannedSprints={plannedSprints}
          onClose={() => setShowCompleteModal(false)}
        />
      )}

      {/* ── Invite Member Modal ────────────────────────────────────────── */}
      {projectId && (
        <InviteMemberModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          projectId={projectId}
        />
      )}

      {/* ── Remove Member Confirmation Dialog ────────────────────────── */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the team? They will lose access to all project resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (memberToRemove && projectId) {
                   await removeMember(projectId, memberToRemove);
                   setMemberToRemove(null);
                }
              }}
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
