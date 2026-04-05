import { useState, useEffect } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { useParams } from 'react-router-dom';
import { KanbanColumn } from './KanbanColumn';
import { BacklogView } from './BacklogView';
import { TaskDetailPanel } from './TaskDetailPanel';
import { CompleteSprintModal } from './SprintModals';
import {
  Loader2, AlertCircle, RefreshCw, Search, Plus, MoreHorizontal,
  Layout, Code2, Presentation, Calendar, Share2, Zap, CheckCircle2, Users,
  Activity, Bot, Shield, Github, GitBranch, ExternalLink, Mail, UserPlus,
} from 'lucide-react';
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

export function WorkflowBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, currentTeamId, ensureDefaultTeam, permissions, teams } = useProjectStore();
  const {
    statuses, tasks, sprints, loading, error, selectedTaskId,
    fetchWorkflows, fetchTasks, fetchSprints, updateTaskStatus, setSelectedTask, setTeamId,
  } = useWorkflowStore();

  const [currentTab, setCurrentTab] = useState<'summary' | 'backlog' | 'board' | 'code' | 'activity' | 'decisions' | 'team'>('board');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Activity & Decisions state
  const [events, setEvents] = useState<any[]>([]);
  const { aiDecisions, fetchAIDecisions } = useWorkflowStore();
  const { members, fetchMembers, roles, fetchRoles } = useProjectStore();

  // GitHub Integration State
  const [linkedRepos, setLinkedRepos] = useState<any[]>([]);
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [linkingRepo, setLinkingRepo] = useState<number | null>(null);

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
  const activeSprintTasks = activeSprint
    ? tasks.filter((t) => t.sprint_id === activeSprint.id)
    : tasks; // fallback: show all if no sprint set up yet

  const incompleteTasks = activeSprintTasks.filter((t) => t.status_category !== 'DONE').length;

  const loadGitHubData = async (teamId: string) => {
    setLoadingRepos(true);
    try {
      const promises: [Promise<any[]>, Promise<any[]> | null] = [
        api.getTeamGitHubRepositories(teamId),
        permissions.includes('MANAGE_TEAM') ? api.listGitHubRepositories(teamId) : Promise.resolve([])
      ];
      
      const [linked, available] = await Promise.all(promises);
      setLinkedRepos(linked || []);
      setAvailableRepos((available || []).filter((r: any) => !r.teamId));
    } catch (err) {
      console.error('Failed to load GitHub data', err);
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

  useEffect(() => {
    const boot = async () => {
      if (!projectId) return;

      const teamId = currentTeamId || (await ensureDefaultTeam(projectId));
      
      // Handle GitHub redirection status
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('status') === 'github_success') {
        toast.success('GitHub App installed and repositories synced!');
        setCurrentTab('code'); // Auto-switch to Code tab to show available repos
        loadGitHubData(teamId); // Ensure data is reloaded immediately
        
        // Remove the query param from URL without refreshing
        const newUrl = window.location.pathname + (teamId ? `?team_id=${teamId}` : '');
        window.history.replaceState({}, document.title, newUrl);
      } else if (urlParams.get('status') === 'github_error') {
        toast.error('Failed to complete GitHub installation.');
        const newUrl = window.location.pathname + (teamId ? `?team_id=${teamId}` : '');
        window.history.replaceState({}, document.title, newUrl);
      }

      setTeamId(teamId);
      
      const promises: Promise<any>[] = [
        fetchWorkflows(),
        fetchTasks(),
        fetchSprints(),
      ];

      if (currentTab === 'activity') promises.push(fetchEvents(teamId));
      if (currentTab === 'decisions') promises.push(fetchAIDecisions());
      if (currentTab === 'team') {
        promises.push(fetchMembers(projectId));
        promises.push(fetchRoles(projectId));
      }
      if (currentTab === 'code') promises.push(loadGitHubData(teamId));

      await Promise.all(promises);
    };
    void boot();
  }, [projectId, currentTeamId, ensureDefaultTeam, setTeamId, fetchWorkflows, fetchTasks, fetchSprints, currentTab, fetchAIDecisions, fetchMembers, fetchRoles]);

  const handleConnectGitHub = async () => {
    try {
      const { url } = await api.getGitHubInstallUrl(currentTeamId || undefined, window.location.origin);
      // Seamless redirection in the same window
      window.location.href = url;
    } catch (err) {
      toast.error('Failed to get installation URL');
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (!permissions.includes('UPDATE_TASK')) {
      toast.error('You do not have permission to update tasks (Read-only access)');
      return;
    }
    const { draggableId, destination } = result;
    if (result.source.droppableId !== destination.droppableId) {
      updateTaskStatus(draggableId, destination.droppableId);
    }
  };

  const sortedStatuses = [...statuses].sort((a, b) => a.stage_order - b.stage_order);

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
        <Button variant="outline" size="sm" onClick={() => { fetchWorkflows(); fetchTasks(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col border-b border-border bg-background pt-2">
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
        <div className="flex items-center gap-1 px-6">
          {[
            { id: 'summary', label: 'Summary', icon: Presentation },
            { id: 'backlog', label: 'Backlog', icon: Calendar },
            { id: 'board', label: 'Board', icon: Layout },
            { id: 'code', label: 'Code', icon: Code2 },
            { id: 'activity', label: 'AI Activity', icon: Activity },
            { id: 'decisions', label: 'AI Decisions', icon: Bot },
            { id: 'team', label: 'Team', icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="ghost"
              onClick={() => setCurrentTab(id as any)}
              className={cn(
                'h-9 px-3 mb-[-1px] font-normal rounded-none hover:bg-transparent transition-all text-sm',
                currentTab === id
                  ? 'border-b-2 border-primary text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="mr-1.5 h-4 w-4" />
              {label}
            </Button>
          ))}
          {permissions.includes('MANAGE_TEAM') && (
            <Button variant="ghost" size="icon" className="h-9 w-9 mb-[-1px] text-muted-foreground rounded-none">
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

      {/* ── Filter Row ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-2 bg-muted/20 border-b border-border">
        <div className="relative w-48 transition-all focus-within:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search board"
            className="h-8 pl-8 bg-background border-border text-xs"
          />
        </div>
        <div className="flex -space-x-1">
          <div className="h-7 w-7 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-medium border-2 border-background">NB</div>
          <div className="h-7 w-7 rounded-full bg-blue-900 text-white text-[10px] flex items-center justify-center font-medium border-2 border-background">SG</div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground font-medium">
          Filter
        </Button>
        <div className="flex-1" />
        <Button
          onClick={() => { fetchWorkflows(); fetchTasks(); fetchSprints(); }}
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'board' ? (
          <div className="h-full overflow-x-auto p-4 bg-[#f4f5f7]/30 dark:bg-transparent">
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
                <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
                  {sortedStatuses.map((status) => (
                    <KanbanColumn
                      key={status.id}
                      status={status}
                      tasks={activeSprintTasks.filter((t) => t.status_id === status.id)}
                    />
                  ))}
                </div>
              </DragDropContext>
            )}
          </div>
        ) : currentTab === 'backlog' ? (
          <div className="h-full overflow-y-auto">
            <BacklogView />
          </div>
        ) : currentTab === 'summary' ? (
          <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Sprint</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{activeSprint?.name || 'None'}</p>
                </CardContent>
              </Card>
              <Card className="bg-success/5 border-success/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{tasks.filter(t => t.status_category === 'DONE').length}</p>
                </CardContent>
              </Card>
              <Card className="bg-warning/5 border-warning/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{tasks.filter(t => t.status_category === 'ACTIVE').length}</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Velocity</CardTitle>
                <CardDescription>Performance over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
                Velocity data will populate as more tasks are completed.
              </CardContent>
            </Card>
          </div>
        ) : currentTab === 'activity' ? (
          <div className="h-full overflow-y-auto p-6 space-y-2 scrollbar-thin">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Activity className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              </div>
            ) : (
              events.map((event: any) => (
                <div key={event.id} className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 mx-auto max-w-4xl">
                  <Badge variant="secondary" className="shrink-0 text-[10px] bg-primary/10 text-primary">
                    {event.event_type}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      {event.metadata?.message || event.metadata?.description || event.event_type}
                    </p>
                    {event.task_id && (
                      <p className="text-xs text-muted-foreground">Task #{event.task_id}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {new Date(event.created_at || event.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : currentTab === 'decisions' ? (
          <div className="h-full overflow-y-auto p-6 scrollbar-thin max-w-4xl mx-auto">
            {aiDecisions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Bot className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No AI decisions yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {aiDecisions.filter(d => d.status === 'PENDING_APPROVAL').length > 0 && (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase text-warning">Pending Approval</h2>
                    <div className="space-y-3">
                      {aiDecisions.filter(d => d.status === 'PENDING_APPROVAL').map((d) => (
                        <AIDecisionCard key={d.id} decision={d} onAction={fetchAIDecisions} />
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Decision History</h2>
                  <div className="space-y-3">
                    {aiDecisions.filter(d => d.status !== 'PENDING_APPROVAL').map((d) => (
                      <AIDecisionCard key={d.id} decision={d} onAction={fetchAIDecisions} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : currentTab === 'team' ? (
          <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Members ({members.length})
                </CardTitle>
                <CardDescription>Manage members for this specific team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">No team members yet</p>
                ) : (
                  members.map((member) => {
                    const memberRole = roles.find((r) => r.id === member.role_id);
                    return (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {member.full_name?.[0]?.toUpperCase() || member.email[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.full_name || member.email}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{memberRole?.name || '—'}</Badge>
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            member.status === 'ACTIVE' ? 'border-success/30 text-success' : 'border-warning/30 text-warning'
                          )}>
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        ) : currentTab === 'code' ? (
          <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {permissions.includes('MANAGE_TEAM') && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#24292e] text-white">
                          <Github className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">GitHub App</CardTitle>
                          <CardDescription>Team Integration</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Connect this team to GitHub to allow the AI to track PRs and commits.
                    </p>
                    <Button variant="outline" className="w-full gap-2" onClick={handleConnectGitHub}>
                      <ExternalLink className="h-4 w-4" />
                      Connect GitHub
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
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
                    linkedRepos.map((repo) => (
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Available Repositories
                    {loadingRepos && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </CardTitle>
                  <CardDescription>Select a repository to link with this team.</CardDescription>
                </CardHeader>
                <CardContent>
                  {availableRepos.length === 0 ? (
                    <div className="text-center py-6 bg-muted/10 rounded-lg border border-dashed">
                      <p className="text-xs text-muted-foreground">No available repositories found.</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-3 gap-2" 
                        onClick={() => currentTeamId && loadGitHubData(currentTeamId)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh Repositories
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
          </div>
        ) : null}
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
    </div>
  );
}
