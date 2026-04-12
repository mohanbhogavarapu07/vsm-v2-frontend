import React, { useState, useMemo, useCallback } from 'react';
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
  Search,
  Pencil,
  Trash2,
  Flag,
  ArrowDown,
  Equal,
  ArrowUp,
  ChevronsUp,
  X,
  UserPlus,
  SlidersHorizontal,
  Check,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { StartSprintModal, CompleteSprintModal } from './SprintModals';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const priorityIconMap: Record<string, React.ReactNode> = {
  LOW: <ArrowDown className="text-blue-500 h-3.5 w-3.5" />,
  MEDIUM: <Equal className="text-orange-500 h-3.5 w-3.5" />,
  HIGH: <ArrowUp className="text-red-500 h-3.5 w-3.5" />,
  CRITICAL: <ChevronsUp className="text-red-600 h-3.5 w-3.5" />
};

const priorityOptions = [
  { value: 'LOW', label: 'Low', icon: <ArrowDown className="h-3.5 w-3.5 text-blue-500" />, color: 'text-blue-500' },
  { value: 'MEDIUM', label: 'Medium', icon: <Minus className="h-3.5 w-3.5 text-amber-500" />, color: 'text-amber-500' },
  { value: 'HIGH', label: 'High', icon: <ArrowUp className="h-3.5 w-3.5 text-red-500" />, color: 'text-red-500' },
  { value: 'CRITICAL', label: 'Critical', icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />, color: 'text-red-600' },
];

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
    updateTaskOrder,
    createTask,
  } = useWorkflowStore();
  const { permissions, members } = useProjectStore();

  const hasPermission = (perm: string) => permissions.includes(perm);

  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [moveBacklogOnCreate, setMoveBacklogOnCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const activeSprints = useMemo(() => sprints.filter((s) => s.status === 'ACTIVE'), [sprints]);
  const plannedSprints = useMemo(() => 
    sprints.filter((s) => s.status === 'PLANNED').sort((a, b) => Number(a.id) - Number(b.id)),
    [sprints]
  );
  const completedSprints = useMemo(() => sprints.filter((s) => s.status === 'COMPLETED'), [sprints]);

  const matchFilters = useCallback((t: any) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && String(t.status_id) !== statusFilter) return false;
    return true;
  }, [searchQuery, priorityFilter, statusFilter]);

  const backlogTasks = useMemo(() => 
    tasks.filter((t) => !t.sprint_id && matchFilters(t)).sort((a, b) => (a.order || 1000) - (b.order || 1000)),
    [tasks, matchFilters]
  );

  const filteredTasksForSprint = useCallback((sprintId: string) =>
    tasks.filter((t) => t.sprint_id === Number(sprintId) && matchFilters(t)).sort((a, b) => (a.order || 1000) - (b.order || 1000)),
    [tasks, matchFilters]
  );

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination, source } = result;
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const targetSprintId =
      destination.droppableId === 'backlog'
        ? null
        : destination.droppableId.replace('sprint-', '');

    const targetTasks = targetSprintId === null ? backlogTasks : filteredTasksForSprint(targetSprintId);
    
    const filteredTargetTasks = destination.droppableId === source.droppableId
        ? targetTasks.filter(t => t.id !== draggableId)
        : targetTasks;
    
    let newOrder = 1000;
    
    if (filteredTargetTasks.length === 0) {
      newOrder = 1000;
    } else if (destination.index === 0) {
      newOrder = (filteredTargetTasks[0].order || 1000) - 1000;
    } else if (destination.index >= filteredTargetTasks.length) {
      newOrder = (filteredTargetTasks[filteredTargetTasks.length - 1].order || 1000) + 1000;
    } else {
      const prevOrder = filteredTargetTasks[destination.index - 1].order || 1000;
      const nextOrder = filteredTargetTasks[destination.index].order || 1000;
      newOrder = prevOrder + (nextOrder - prevOrder) / 2;
    }

    updateTaskOrder(draggableId, targetSprintId, newOrder);
  }, [backlogTasks, filteredTasksForSprint, updateTaskOrder]);

  const handleCreateSprint = async () => {
    if (!newSprintName.trim()) return;
    const sDate = newSprintStart ? new Date(newSprintStart).toISOString() : undefined;
    const eDate = newSprintEnd ? new Date(newSprintEnd).toISOString() : undefined;
    const newSprint = await createSprint(newSprintName.trim(), undefined, sDate, eDate);
    
    if (moveBacklogOnCreate && newSprint) {
      const currentBacklogTasks = useWorkflowStore.getState().tasks
        .filter((t) => !t.sprint_id)
        .sort((a, b) => (a.order || 1000) - (b.order || 1000));
      
      for (const t of currentBacklogTasks) {
        await updateTaskSprint(t.id, newSprint.id);
      }

      await useWorkflowStore.getState().fetchTasks();
      await useWorkflowStore.getState().fetchSprints();
    }

    setNewSprintName('');
    setNewSprintStart('');
    setNewSprintEnd('');
    setMoveBacklogOnCreate(false);
    setIsCreatingSprint(false);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto scrollbar-thin">
      
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col gap-2 px-8 py-3 bg-background/95 backdrop-blur-sm border-b border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-[240px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search backlog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-9 bg-muted/30 focus-visible:ring-primary/20 text-sm rounded-lg"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5 border-border/60 text-xs',
                    (priorityFilter !== 'all' || statusFilter !== 'all') && 'border-primary/40 text-primary bg-primary/5'
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filter
                  {(priorityFilter !== 'all' || statusFilter !== 'all') && (
                    <span className="ml-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                      {[priorityFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-8 w-full bg-transparent border-border/60">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-full bg-transparent border-border/60">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {useWorkflowStore.getState().statuses.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(priorityFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground"
                    onClick={() => { setPriorityFilter('all'); setStatusFilter('all'); }}
                  >
                    <X className="h-3 w-3 mr-1" /> Clear filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div
                title="Unassigned"
                className="h-7 w-7 rounded-full border-2 border-background border-dashed border-muted-foreground/40 flex items-center justify-center bg-muted/40 cursor-pointer hover:scale-110 transition-transform z-10"
              >
                <UserPlus className="h-3 w-3 text-muted-foreground/60" />
              </div>
              {members.slice(0, 5).map((member, i) => {
                const initials = member.full_name
                  ? member.full_name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
                  : member.email.substring(0, 2).toUpperCase();
                const colors = [
                  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
                  'bg-violet-500', 'bg-cyan-500', 'bg-rose-500', 'bg-emerald-500',
                ];
                return (
                  <div
                    key={member.id}
                    title={member.full_name || member.email}
                    className={`h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white cursor-pointer hover:scale-110 transition-transform select-none ${colors[i % colors.length]}`}
                    style={{ zIndex: 10 + i }}
                  >
                    {initials}
                  </div>
                );
              })}
              {members.length > 5 && (
                <div className="h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground bg-muted">
                  +{members.length - 5}
                </div>
              )}
            </div>

            {completedSprints.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                {completedSprints.length} completed
              </span>
            )}

            {hasPermission('MANAGE_TEAM') && (
              <Button
                size="sm"
                onClick={() => {
                  setNewSprintName(nextSprintName(sprints));
                  setIsCreatingSprint(true);
                }}
                className="h-7 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Sprint
              </Button>
            )}
          </div>
        </div>
        
        {isCreatingSprint && (
          <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border mt-1 animate-in slide-in-from-top-2 duration-150">
            <Input
              autoFocus
              placeholder={nextSprintName(sprints)}
              value={newSprintName}
              onChange={(e) => setNewSprintName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSprint();
                if (e.key === 'Escape') setIsCreatingSprint(false);
              }}
              className="h-8 text-sm w-64 bg-background"
            />
            <Input
              type="date"
              value={newSprintStart}
              onChange={(e) => setNewSprintStart(e.target.value)}
              className="h-8 text-sm w-40 bg-background"
              title="Start Date"
            />
            <Input
              type="date"
              value={newSprintEnd}
              onChange={(e) => setNewSprintEnd(e.target.value)}
              className="h-8 text-sm w-40 bg-background"
              title="End Date"
            />
            <Button size="sm" onClick={handleCreateSprint} className="shrink-0 h-8 px-4 font-medium">
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreatingSprint(false)} className="h-8 px-3 text-muted-foreground">
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="px-8 py-4 pb-24">
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

        {/* ── Backlog Section ───────────────────────────────────────────── */}
        <div className="flex flex-col mt-6">
          <div className="flex items-center justify-between py-2 mb-1">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[15px] font-semibold text-foreground">Backlog</h2>
              <span className="text-xs font-medium text-muted-foreground rounded-full bg-muted/60 px-2 py-0.5">
                {backlogTasks.length} issues
              </span>
            </div>

            {hasPermission('MANAGE_TEAM') && backlogTasks.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  setNewSprintName(nextSprintName(sprints));
                  setMoveBacklogOnCreate(true);
                  setIsCreatingSprint(true);
                }}
                className="h-7 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Sprint
              </Button>
            )}
          </div>

          <Droppable droppableId="backlog">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'min-h-[60px] flex flex-col transition-colors duration-150 border-2 border-transparent rounded-md',
                  snapshot.isDraggingOver ? 'bg-primary/[0.03] border-primary/20' : ''
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

  const { updateSprint, deleteSprint } = useWorkflowStore();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(sprint.name);

  const formatForDateInput = (isoString?: string) => isoString ? new Date(isoString).toISOString().split('T')[0] : '';
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editStart, setEditStart] = useState(formatForDateInput(sprint.startDate));
  const [editEnd, setEditEnd] = useState(formatForDateInput(sprint.endDate));

  const handleSaveName = async () => {
    if (editName.trim() && editName.trim() !== sprint.name) {
      await updateSprint(sprint.id, { name: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handleSaveDates = async () => {
    await updateSprint(sprint.id, {
      startDate: editStart ? new Date(editStart).toISOString() : undefined,
      endDate: editEnd ? new Date(editEnd).toISOString() : undefined,
    });
    setIsEditingDates(false);
  };

  const { permissions } = useProjectStore();
  const hasPermission = (perm: string) => permissions.includes(perm);

  const task_counts = sprint.task_counts || { total: 0, todo: 0, in_progress: 0, done: 0 };
  const incompleteTasks = tasks.filter((t) => t.status_category !== 'DONE').length;
  const plannedSprints = allSprints.filter(
    (s) => s.status === 'PLANNED' && s.id !== sprint.id
  );

  const dateRange = formatDateRange(sprint.startDate, sprint.endDate);

  return (
    <>
      <div className="flex flex-col mt-4 first:mt-0">
        {/* Sprint header */}
        <div
          className={cn(
            'flex items-center justify-between py-2.5 px-4 rounded-t-md border border-border border-b-0',
            isActive ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'bg-muted/40'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0 rounded p-0.5 hover:bg-muted-foreground/10 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isEditingName ? (
              <Input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') { setEditName(sprint.name); setIsEditingName(false); }
                }}
                className="h-7 text-sm font-semibold min-w-[200px]"
              />
            ) : (
              <h2 className="text-[14px] font-semibold text-foreground truncate">{sprint.name}</h2>
            )}

            {isEditingDates ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={editStart}
                  title="Start Date"
                  onChange={(e) => setEditStart(e.target.value)}
                  className="h-7 w-[120px] rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <input
                  type="date"
                  value={editEnd}
                  title="End Date"
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="h-7 w-[120px] rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button size="sm" onClick={handleSaveDates} className="h-7 w-7 p-0 ml-1">
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingDates(false)} className="h-7 w-7 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group/dates">
                {dateRange && (
                  <span className="text-xs text-muted-foreground shrink-0">{dateRange}</span>
                )}
                <Pencil 
                  className={cn("h-3 w-3 text-muted-foreground cursor-pointer hover:text-primary transition-opacity flex-shrink-0", dateRange ? "opacity-0 group-hover/dates:opacity-100" : "opacity-0 group-hover/dates:opacity-100")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingDates(true);
                  }}
                />
              </div>
            )}

            <span className="text-xs text-muted-foreground shrink-0">
              ({tasks.length} issue{tasks.length !== 1 ? 's' : ''})
            </span>

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
                    className="h-7 text-xs"
                    onClick={() => setShowStartModal(true)}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Start sprint
                  </Button>
                ) : null}
              </>
            )}

            {hasPermission('MANAGE_ROLES') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit sprint
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditingDates(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit dates
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => deleteSprint(sprint.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete sprint
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  'flex flex-col min-h-[44px] border border-border border-t-0 p-0 transition-colors duration-150',
                  snapshot.isDraggingOver ? 'bg-primary/[0.03] border-primary/20' : 'bg-background'
                )}
              >
                {tasks.length === 0 && !snapshot.isDraggingOver && (
                  <div className="py-8 text-center text-sm font-medium text-muted-foreground border-t border-dashed border-border/50">
                    Plan a sprint by dragging issues here.
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

const BacklogItem = React.memo(function BacklogItem({ task, index }: { task: Task; index: number }) {
  const { setSelectedTask, updateTaskDetails } = useWorkflowStore();
  const members = useProjectStore((s) => s.members);

  const matchedMember = members.find((m) => m.id === String(task.assignee_id));
  const assigneeInitials = matchedMember?.full_name ? matchedMember.full_name.substring(0, 2).toUpperCase() : '?';

  const statusColor = task.status_category === 'DONE' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                   : task.status_category === 'ACTIVE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                   : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleSave = async () => {
    if (editTitle.trim() !== task.title) {
       await updateTaskDetails(task.id, { title: editTitle.trim() } as any);
    }
    setIsEditing(false);
  };

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => {
            if (!isEditing) setSelectedTask(task.id);
          }}
          className={cn(
            'group flex items-center gap-3 px-2 py-2 bg-background border-border border-b last:border-b-0 cursor-pointer',
            'hover:bg-muted/30 transition-colors duration-100',
            snapshot.isDragging ? 'shadow-lg ring-1 ring-primary/20 rotate-[0.5deg] z-50 border-x border-t rounded-md' : ''
          )}
        >
          <div className="shrink-0 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded h-5 w-5 text-[10px] font-bold shadow-sm">
            T
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono text-muted-foreground/60 uppercase">{String(task.id)}</span>
          </div>

          <div className="flex-1 min-w-0 px-1 flex items-center gap-2">
            {isEditing ? (
              <Input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') { setEditTitle(task.title); setIsEditing(false); }
                }}
                className="h-7 text-sm"
              />
            ) : (
              <>
                <span className="text-[13px] text-foreground truncate">{task.title}</span>
                <Pencil 
                   className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer hover:text-primary"
                   onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                   }}
                />
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 shrink-0 ml-auto pr-1">
            {task.priority && priorityIconMap[task.priority] && (
              <div title={`Priority: ${task.priority}`}>
                {priorityIconMap[task.priority]}
              </div>
            )}
            
            {task.status_name && (
              <span className={cn('text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap', statusColor)}>
                {task.status_name}
              </span>
            )}

            <div className="flex items-center justify-center w-6">
              {matchedMember ? (
                <Avatar className="h-6 w-6 border shadow-sm">
                  <AvatarFallback className="text-[9px] font-medium bg-muted">{assigneeInitials}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                  <UserPlus className="h-3 w-3 text-muted-foreground/50" />
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    useWorkflowStore.getState().deleteTask(task.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </Draggable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// INLINE ADD TASK (Horizontal bar with assignee + priority)
// ─────────────────────────────────────────────────────────────────────────────

function InlineAddTask({ sprintId }: { sprintId: string | null }) {
  const { createTask, statuses } = useWorkflowStore();
  const { members } = useProjectStore();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  const selectedPriority = priorityOptions.find(p => p.value === priority) || priorityOptions[1];
  const selectedAssignee = assigneeId ? members.find(m => m.id === assigneeId) : null;

  const resetForm = () => {
    setTitle('');
    setPriority('MEDIUM');
    setAssigneeId(null);
    setIsAdding(false);
  };

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      resetForm();
      return;
    }
    const defaultStatusId = statuses.length > 0 ? String(statuses[0].id) : undefined;
    await createTask(trimmed, defaultStatusId, sprintId || undefined, assigneeId, priority);
    resetForm();
  };

  if (!isAdding) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
        className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 w-full text-left transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Create issue
      </button>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 px-2 py-1.5 bg-primary/[0.02] border-t border-primary/10 animate-in fade-in duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded h-5 w-5 text-[10px] font-bold">
        +
      </div>
      <Input
        autoFocus
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') resetForm();
        }}
        className="h-7 text-sm flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
      />
      
      {/* Priority selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-6 flex items-center gap-1 px-1.5 rounded text-xs text-muted-foreground hover:bg-muted/60 transition-colors shrink-0">
            {selectedPriority.icon}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {priorityOptions.map((p) => (
            <DropdownMenuItem key={p.value} onClick={() => setPriority(p.value)} className="flex items-center gap-2">
              {p.icon}
              <span className={cn("text-xs font-medium", p.color)}>{p.label}</span>
              {priority === p.value && <Check className="h-3 w-3 ml-auto text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Assignee selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted/60 transition-colors shrink-0">
            {selectedAssignee ? (
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-primary/15 text-primary font-semibold">
                  {selectedAssignee.full_name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setAssigneeId(null)}>
            <UserPlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Unassigned
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {members.map((m) => (
            <DropdownMenuItem key={m.id} onClick={() => setAssigneeId(m.id)} className="flex items-center gap-2">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px]">{m.full_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <span className="truncate text-xs">{m.full_name || m.email}</span>
              {assigneeId === m.id && <Check className="h-3 w-3 ml-auto text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" onClick={handleAdd} disabled={!title.trim()} className="h-6 px-2.5 text-[11px] shrink-0">
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={resetForm} className="h-6 w-6 p-0 shrink-0">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT STAT BADGE
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
