import { useState } from 'react';
import { useWorkflowStore, type Sprint } from '@/stores/workflowStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  CalendarDays,
  Target,
  MoveRight,
  Inbox,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// START SPRINT MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface StartSprintModalProps {
  sprint: Sprint;
  taskCount: number;
  onClose: () => void;
}

export function StartSprintModal({ sprint, taskCount, onClose }: StartSprintModalProps) {
  const { startSprint } = useWorkflowStore();

  // Default: 2-week sprint from today
  const today = new Date();
  const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const toDateInputValue = (d: Date) => d.toISOString().slice(0, 10);

  const [goal, setGoal] = useState(sprint.goal || '');
  const [startDate, setStartDate] = useState(
    sprint.startDate ? sprint.startDate.slice(0, 10) : toDateInputValue(today)
  );
  const [endDate, setEndDate] = useState(
    sprint.endDate ? sprint.endDate.slice(0, 10) : toDateInputValue(twoWeeksLater)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!startDate || !endDate) {
      setError('Please set both start and end dates.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await startSprint(sprint.id, {
        goal: goal.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to start sprint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Play className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Start Sprint</h2>
              <p className="text-xs text-muted-foreground">{sprint.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Task count summary */}
        <div className="mb-5 p-3 rounded-lg bg-muted/40 border border-border flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
            {taskCount}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{taskCount} issue{taskCount !== 1 ? 's' : ''}</span>
            {' '}will be included in this sprint
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                Start Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                End Date
              </Label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Target className="h-3 w-3 text-muted-foreground" />
              Sprint Goal
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="e.g. Ship user authentication and onboarding flow"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleStart}
            disabled={loading}
            className="bg-primary text-primary-foreground gap-1.5"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Starting…
              </span>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Start Sprint
              </>
            )}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE SPRINT MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface CompleteSprintModalProps {
  sprint: Sprint;
  incompleteTasks: number;
  plannedSprints: Sprint[];   // sprints the user can roll over to
  onClose: () => void;
}

export function CompleteSprintModal({
  sprint,
  incompleteTasks,
  plannedSprints,
  onClose,
}: CompleteSprintModalProps) {
  const { completeSprint } = useWorkflowStore();

  const [rolloverTarget, setRolloverTarget] = useState<string>('backlog'); // 'backlog' or sprint id
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      const rolloverSprintId = rolloverTarget === 'backlog' ? null : rolloverTarget;
      await completeSprint(sprint.id, rolloverSprintId);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to complete sprint');
    } finally {
      setLoading(false);
    }
  };

  const targetLabel =
    rolloverTarget === 'backlog'
      ? 'Move to Backlog'
      : plannedSprints.find((s) => s.id === rolloverTarget)?.name ?? 'Select sprint';

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Complete Sprint</h2>
              <p className="text-xs text-muted-foreground">{sprint.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatCard
            label="Total"
            value={sprint.task_counts.total}
            color="text-foreground"
            bg="bg-muted/40"
          />
          <StatCard
            label="Completed"
            value={sprint.task_counts.done}
            color="text-green-600"
            bg="bg-green-50 dark:bg-green-950/20"
          />
          <StatCard
            label="Incomplete"
            value={incompleteTasks}
            color="text-orange-600"
            bg="bg-orange-50 dark:bg-orange-950/20"
          />
        </div>

        {/* Incomplete task handling */}
        {incompleteTasks > 0 && (
          <div className="mb-5">
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold text-orange-600">{incompleteTasks}</span>
              {' '}incomplete issue{incompleteTasks !== 1 ? 's' : ''} will be moved to:
            </p>

            {/* Custom dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border bg-background text-sm hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {rolloverTarget === 'backlog' ? (
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MoveRight className="h-4 w-4 text-primary" />
                  )}
                  <span>{targetLabel}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-border bg-background shadow-lg z-50 overflow-hidden">
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left",
                      rolloverTarget === 'backlog' && "bg-muted/30 font-medium"
                    )}
                    onClick={() => { setRolloverTarget('backlog'); setDropdownOpen(false); }}
                  >
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                    Backlog
                    {rolloverTarget === 'backlog' && <span className="ml-auto text-primary text-xs">✓</span>}
                  </button>
                  {plannedSprints.map((s) => (
                    <button
                      key={s.id}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left",
                        rolloverTarget === s.id && "bg-muted/30 font-medium"
                      )}
                      onClick={() => { setRolloverTarget(s.id); setDropdownOpen(false); }}
                    >
                      <MoveRight className="h-4 w-4 text-primary" />
                      {s.name}
                      {rolloverTarget === s.id && <span className="ml-auto text-primary text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {incompleteTasks === 0 && (
          <div className="mb-5 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            All issues completed! Great sprint. 🎉
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Completing…
              </span>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete Sprint
              </>
            )}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: MODAL OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border rounded-xl shadow-2xl p-6 w-full mx-4 animate-in fade-in zoom-in-95 duration-150">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn("rounded-lg p-3 text-center border border-border", bg)}>
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
