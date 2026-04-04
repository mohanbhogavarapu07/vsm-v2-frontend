import { useState, useMemo } from 'react';
import { useWorkflowStore, type Task, type Sprint } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Play,
  CheckCircle2,
  GripVertical,
  Search,
  Pencil,
  Trash2,
  Flag,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { StartSprintModal, CompleteSprintModal } from './SprintModals';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '';
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
  if (startDate) return `Started ${fmt(startDate)}`;
  return `Ends ${fmt(endDate!)}`;
}

function nextSprintName(sprints: Sprint[]): string {
  const nums = sprints
    .map((s) => {
      const m = s.name.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return `Sprint ${max + 1}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BACKLOG VIEW
// ─────────────────────────────────────────────────────────────────────────────

export function BacklogView() {
  const {
    tasks,
    sprints,
    createSprint,
    updateTaskSprint,
    createTask,
  } = useWorkflowStore();
  const { permissions } = useProjectStore();

  const hasPermission = (perm: string) => permissions.includes(perm);

  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeSprints = sprints.filter((s) => s.status === 'ACTIVE');
  const plannedSprints = sprints
    .filter((s) => s.status === 'PLANNED')
    .sort((a, b) => Number(a.id) - Number(b.id));
  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED');

  const backlogTasks = tasks.filter(
    (t) => !t.sprint_id && (searchQuery === '' || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTasksForSprint = (sprintId: string) =>
    tasks.filter(
      (t) =>
        t.sprint_id === sprintId &&
        (searchQuery === '' || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const targetSprintId =
      destination.droppableId === 'backlog'
        ? null
        : destination.droppableId.replace('sprint-', '');
    updateTaskSprint(draggableId, targetSprintId);
  };

  const handleCreateSprint = async () => {
    if (!newSprintName.trim()) return;
    const sDate = newSprintStart ? new Date(newSprintStart).toISOString() : undefined;
    const eDate = newSprintEnd ? new Date(newSprintEnd).toISOString() : undefined;
    await createSprint(newSprintName.trim(), undefined, sDate, eDate);
    setNewSprintName('');
    setNewSprintStart('');
    setNewSprintEnd('');
    setIsCreatingSprint(false);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-20">
      {/* Search bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search backlog…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
        <div className="flex-1" />
        {/* Completed sprints count */}
        {completedSprints.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedSprints.length} completed sprint{completedSprints.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* ── Active Sprints ─────────────────────────────────────────────── */}
        {activeSprints.map((s) => (
          <SprintSection
            key={s.id}
            sprint={s}
            tasks={filteredTasksForSprint(s.id)}
            allSprints={sprints}
            isActive
          />
        ))}

        {/* ── Planned Sprints ────────────────────────────────────────────── */}
        {plannedSprints.map((s) => (
          <SprintSection
            key={s.id}
            sprint={s}
            tasks={filteredTasksForSprint(s.id)}
            allSprints={sprints}
            isActive={false}
          />
        ))}

        {/* ── Create Sprint Button ─────────────────────────────────────── */}
        {hasPermission('MANAGE_TEAM') && (
          <div className="px-6 py-4">
            {isCreatingSprint ? (
              <div className="flex items-center gap-2 max-w-2xl bg-muted/30 p-2 rounded-lg border border-border">
                <Input
                  autoFocus
                  placeholder={nextSprintName(sprints)}
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSprint();
                    if (e.key === 'Escape') setIsCreatingSprint(false);
                  }}
                  className="h-8 text-sm w-48"
                />
                <Input
                  type="date"
                  value={newSprintStart}
                  onChange={(e) => setNewSprintStart(e.target.value)}
                  className="h-8 text-sm w-36"
                  title="Start Date"
                />
                <Input
                  type="date"
                  value={newSprintEnd}
                  onChange={(e) => setNewSprintEnd(e.target.value)}
                  className="h-8 text-sm w-36"
                  title="End Date"
                />
                <Button size="sm" onClick={handleCreateSprint} className="shrink-0">
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsCreatingSprint(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewSprintName(nextSprintName(sprints));
                  setIsCreatingSprint(true);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create Sprint
              </Button>
            )}
          </div>
        )}

        {/* ── Backlog Section ───────────────────────────────────────────── */}
        <div className="flex flex-col px-6 mt-2">
          <div className="flex items-center justify-between py-2.5 border-b border-border mb-1">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Backlog</h2>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {backlogTasks.length}
              </span>
            </div>
          </div>

          <Droppable droppableId="backlog">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'min-h-[80px] flex flex-col gap-0.5 rounded-md transition-colors',
                  snapshot.isDraggingOver ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                )}
              >
                {backlogTasks.length === 0 && !snapshot.isDraggingOver && (
                  <div className="py-10 text-center text-xs text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                    Your backlog is empty. Create issues to get started.
                  </div>
                )}
                {backlogTasks.map((task, index) => (
                  <BacklogItem key={task.id} task={task} index={index} />
                ))}
                {provided.placeholder}
                {hasPermission('CREATE_TASK') && (
                  <InlineAddTask sprintId={null} />
                )}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT SECTION
// ─────────────────────────────────────────────────────────────────────────────

function SprintSection({
  sprint,
  tasks,
  allSprints,
  isActive,
}: {
  sprint: Sprint;
  tasks: Task[];
  allSprints: Sprint[];
  isActive?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { permissions } = useProjectStore();
  const hasPermission = (perm: string) => permissions.includes(perm);

  const { task_counts } = sprint;
  const incompleteTasks = tasks.filter((t) => t.status_category !== 'DONE').length;
  const plannedSprints = allSprints.filter(
    (s) => s.status === 'PLANNED' && s.id !== sprint.id
  );

  const dateRange = formatDateRange(sprint.startDate, sprint.endDate);

  return (
    <>
      <div className="flex flex-col px-6 mt-5">
        {/* Sprint header */}
        <div
          className={cn(
            'flex items-center justify-between py-2.5 px-3 rounded-t-lg border border-border border-b-0',
            isActive ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
          )}
        >
          {/* Left: expand toggle + name + meta */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0 rounded p-0.5 hover:bg-muted transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            <h2 className="text-sm font-semibold truncate">{sprint.name}</h2>

            {dateRange && (
              <span className="text-xs text-muted-foreground shrink-0">{dateRange}</span>
            )}

            <span className="text-xs text-muted-foreground shrink-0">
              ({tasks.length} issue{tasks.length !== 1 ? 's' : ''})
            </span>

            {/* Jira-style stat badges */}
            {(task_counts.total > 0 || isActive) && (
              <div className="flex items-center gap-1 ml-1">
                <StatBadge value={task_counts.todo} color="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" title="To Do" />
                <StatBadge value={task_counts.in_progress} color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" title="In Progress" />
                <StatBadge value={task_counts.done} color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" title="Done" />
              </div>
            )}

            {isActive && (
              <span className="shrink-0 bg-primary/10 text-primary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wide">
                Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            {hasPermission('MANAGE_TEAM') && (
              <>
                {isActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-border"
                    onClick={() => setShowCompleteModal(true)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
                    Complete sprint
                  </Button>
                ) : sprint.status === 'PLANNED' ? (
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setShowStartModal(true)}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Start sprint
                  </Button>
                ) : null}
              </>
            )}

            {hasPermission('MANAGE_ROLES') && (
              <div className="relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {showMenu && (
                  <SprintContextMenu sprint={sprint} onClose={() => setShowMenu(false)} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sprint goal banner */}
        {sprint.goal && isExpanded && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 border-x border-border text-xs text-muted-foreground">
            <Flag className="h-3 w-3 shrink-0 text-primary/60" />
            <span className="italic truncate">{sprint.goal}</span>
          </div>
        )}

        {/* Task list */}
        {isExpanded && (
          <Droppable droppableId={`sprint-${sprint.id}`}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'min-h-[44px] flex flex-col gap-0.5 border border-border border-t-0 rounded-b-lg p-1 transition-colors',
                  snapshot.isDraggingOver ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''
                )}
              >
                {tasks.length === 0 && !snapshot.isDraggingOver && (
                  <div className="py-7 text-center text-xs text-muted-foreground border-2 border-dashed border-muted rounded-md">
                    Plan a sprint by dragging work items into it, or by dragging the sprint footer.
                  </div>
                )}
                {tasks.map((task, index) => (
                  <BacklogItem key={task.id} task={task} index={index} />
                ))}
                {provided.placeholder}
                {hasPermission('CREATE_TASK') && (
                  <InlineAddTask sprintId={sprint.id} />
                )}
              </div>
            )}
          </Droppable>
        )}
      </div>

      {/* Modals */}
      {showStartModal && (
        <StartSprintModal
          sprint={sprint}
          taskCount={tasks.length}
          onClose={() => setShowStartModal(false)}
        />
      )}
      {showCompleteModal && (
        <CompleteSprintModal
          sprint={sprint}
          incompleteTasks={incompleteTasks}
          plannedSprints={plannedSprints}
          onClose={() => setShowCompleteModal(false)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKLOG ITEM (draggable task row)
// ─────────────────────────────────────────────────────────────────────────────

function BacklogItem({ task, index }: { task: Task; index: number }) {
  const { setSelectedTask } = useWorkflowStore();

  const categoryColor = {
    DONE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    REVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    VALIDATION: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    BACKLOG: 'bg-muted text-muted-foreground',
  } as Record<string, string>;

  const statusColor = categoryColor[task.status_category ?? 'BACKLOG'] ?? 'bg-muted text-muted-foreground';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={() => setSelectedTask(task.id)}
          className={cn(
            'group flex items-center gap-3 px-3 py-2 rounded-md bg-background border border-transparent',
            'hover:border-border hover:bg-muted/30 cursor-pointer transition-all',
            snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30 rotate-1 z-50 border-border' : ''
          )}
        >
          <div {...provided.dragHandleProps} className="shrink-0">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex-1 flex items-center gap-3 min-w-0">
            <span className="text-[11px] font-mono font-medium text-muted-foreground shrink-0 uppercase">
              VSM-{task.id.slice(-4)}
            </span>
            <span className="text-sm truncate">{task.title}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status badge */}
            {task.status_name && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', statusColor)}>
                {task.status_name}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE ADD TASK
// ─────────────────────────────────────────────────────────────────────────────

function InlineAddTask({ sprintId }: { sprintId: string | null }) {
  const { createTask, statuses } = useWorkflowStore();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setIsAdding(false);
      return;
    }
    const defaultStatusId = statuses.length > 0 ? String(statuses[0].id) : undefined;
    await createTask(trimmed, defaultStatusId, sprintId || undefined);
    setTitle('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors w-full text-left"
      >
        <Plus className="h-3.5 w-3.5" />
        Create issue
      </button>
    );
  }

  return (
    <div className="px-1 py-1">
      <Input
        autoFocus
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') { setTitle(''); setIsAdding(false); }
        }}
        onBlur={handleAdd}
        className="h-8 text-sm"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT STAT BADGE (Jira-style 0 / 0 / 0)
// ─────────────────────────────────────────────────────────────────────────────

function StatBadge({ value, color, title }: { value: number; color: string; title: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums',
        color
      )}
    >
      {value}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT CONTEXT MENU  (⋯ button)
// ─────────────────────────────────────────────────────────────────────────────

function SprintContextMenu({ sprint, onClose }: { sprint: Sprint; onClose: () => void }) {
  // Placeholder for rename / delete actions
  return (
    <div
      className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-background shadow-lg z-50 overflow-hidden"
      onMouseLeave={onClose}
    >
      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left">
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        Edit sprint
      </button>
      {sprint.status === 'COMPLETED' && (
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Delete sprint
        </button>
      )}
    </div>
  );
}
