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
} from 'lucide-react';
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
  const { currentProject, currentTeamId, ensureDefaultTeam } = useProjectStore();
  const {
    statuses, tasks, sprints, loading, error, selectedTaskId,
    fetchWorkflows, fetchTasks, fetchSprints, updateTaskStatus, setSelectedTask, setTeamId,
  } = useWorkflowStore();
  const { permissions } = useProjectStore();

  const [currentTab, setCurrentTab] = useState<'summary' | 'backlog' | 'board' | 'code'>('board');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

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

  useEffect(() => {
    const boot = async () => {
      if (!projectId) return;
      const teamId = currentTeamId || (await ensureDefaultTeam(projectId));
      setTeamId(teamId);
      await Promise.all([
        fetchWorkflows(),
        fetchTasks(),
        fetchSprints(),
      ]);
    };
    void boot();
  }, [projectId, currentTeamId, ensureDefaultTeam, setTeamId, fetchWorkflows, fetchTasks, fetchSprints]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
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
              <h1 className="text-xl font-semibold text-foreground">
                {currentTab === 'board' && activeSprint
                  ? `Board — ${activeSprint.name}`
                  : currentTab === 'backlog'
                  ? 'Backlog'
                  : 'Sprint Board'}
              </h1>
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
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} view coming soon…
          </div>
        )}
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
