import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectStore, ACCESS_LEVELS, AccessLevel } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FolderKanban,
  GitBranch,
  GripVertical,
  Loader2,
  Mail,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const STEPS = [
  { id: 'roles', label: 'Define Roles', icon: Shield, description: 'Create roles & assign access levels' },
  { id: 'workflow', label: 'Define Workflow', icon: Workflow, description: 'Set up task lifecycle stages' },
  { id: 'teams', label: 'Create Teams', icon: Users, description: 'Create and organize teams' },
] as const;

type StepId = typeof STEPS[number]['id'];

const WORKFLOW_PRESETS = [
  {
    name: 'Standard Scrum',
    stages: ['Backlog', 'To Do', 'In Progress', 'Code Review', 'Testing', 'Done'],
  },
  {
    name: 'Simple Kanban',
    stages: ['To Do', 'In Progress', 'Done'],
  },
  {
    name: 'Full Pipeline',
    stages: ['Backlog', 'Development', 'Code Review', 'QA', 'UAT', 'Deployment', 'Done'],
  },
];

export default function ProjectSetupPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    currentProject,
    roles,
    workflowStages,
    teams,
    currentTeamId,
    loading,
    error,
    fetchRoles,
    createRole,
    deleteRole,
    updateRole,
    fetchTeams,
    createTeam,
    updateTeamName,
    fetchWorkflowStages,
    createWorkflowStage,
    deleteWorkflowStage,
    reorderWorkflowStages,
    setCurrentProject,
  } = useProjectStore();

  const [activeStep, setActiveStep] = useState<StepId>('roles');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleAccess, setNewRoleAccess] = useState<AccessLevel>('LOW');
  const [creatingRole, setCreatingRole] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  // Workflow state
  const [newStageName, setNewStageName] = useState('');
  const [creatingStage, setCreatingStage] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);

  // Teams state
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');

  const visibleTeams = teams.filter(t => t.name !== 'Initial Team');

  useEffect(() => {
    if (projectId) {
      fetchRoles(projectId);
      fetchTeams(projectId);
      fetchWorkflowStages(projectId);
      if (!currentProject) {
        api.getProject(projectId).then((p) => setCurrentProject(p)).catch(() => {});
      }
    }
  }, [projectId]);

  const stepIndex = STEPS.findIndex((s) => s.id === activeStep);

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !projectId) return;
    setCreatingRole(true);
    try {
      await createRole(projectId, {
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        access_level: newRoleAccess,
      });
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleAccess('LOW');
      setShowAddRole(false);
    } catch {} finally {
      setCreatingRole(false);
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim() || !projectId) return;
    setCreatingStage(true);
    try {
      const nextOrder = workflowStages.length;
      await createWorkflowStage(projectId, {
        name: newStageName.trim(),
        stage_order: nextOrder,
        is_terminal: false,
      });
      setNewStageName('');
    } catch {} finally {
      setCreatingStage(false);
    }
  };

  const handleApplyPreset = async (stages: string[]) => {
    if (!projectId) return;
    setApplyingPreset(true);
    try {
      // Delete existing stages in parallel
      await Promise.all(workflowStages.map((s) => deleteWorkflowStage(projectId, s.id)));
      
      // Create new stages in parallel
      await Promise.all(
        stages.map((stageName, i) =>
          createWorkflowStage(projectId, {
            name: stageName,
            stage_order: i,
            is_terminal: i === stages.length - 1,
          })
        )
      );
    } finally {
      setApplyingPreset(false);
    }
  };

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    if (!projectId || applyingPreset) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workflowStages.length) return;

    const newStages = [...workflowStages];
    const temp = newStages[index];
    newStages[index] = newStages[newIndex];
    newStages[newIndex] = temp;

    const updates = newStages.map((stage, i) => ({
      id: stage.id,
      stage_order: i,
    }));

    await reorderWorkflowStages(projectId, updates);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !projectId || !currentTeamId) return;
    setCreatingTeam(true);
    try {
      if (teams.length === 1 && teams[0].name === 'Initial Team') {
        await updateTeamName(teams[0].id, newTeamName.trim());
        await fetchTeams(projectId);
      } else {
        await createTeam(projectId, { name: newTeamName.trim(), copyFromTeamId: currentTeamId });
      }
      setNewTeamName('');
    } catch {} finally {
      setCreatingTeam(false);
    }
  };

  const handleUpdateTeamName = async (teamId: string) => {
    if (!editTeamName.trim() || !projectId) return;
    try {
      await updateTeamName(teamId, editTeamName.trim());
      setEditingTeamId(null);
      setEditTeamName('');
    } catch {}
  };

  const handleFinishSetup = async () => {
    if (!projectId) return;
    try {
      // route to the board of the first team found
      const t = teams.length > 0 ? teams[0].id : currentTeamId;
      if (t) {
        navigate(`/projects/${projectId}/teams/${t}/board`);
      } else {
        navigate(`/projects/${projectId}`);
      }
    } catch {
      navigate(`/projects/${projectId}`);
    }
  };

  const canProceedFromRoles = roles.length > 0;
  const canProceedFromWorkflow = workflowStages.length >= 2;

  const getAccessBadge = (level: AccessLevel) => {
    const info = ACCESS_LEVELS.find((a) => a.value === level);
    const colorClass =
      level === 'HIGH' ? 'border-destructive/30 text-destructive bg-destructive/10' :
      level === 'MEDIUM' ? 'border-warning/30 text-warning bg-warning/10' :
      'border-muted-foreground/30 text-muted-foreground bg-muted';
    return (
      <Badge variant="outline" className={cn('text-xs', colorClass)}>
        {info?.label || level}
      </Badge>
    );
  };

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <FolderKanban className="h-4 w-4" />
          <span>{currentProject?.name || 'Project'}</span>
          <ChevronRight className="h-3 w-3" />
          <span>Setup</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Set Up Your Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define roles, configure your workflow, and invite your team
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const isActive = step.id === activeStep;
            const isCompleted = i < stepIndex;
            return (
              <div key={step.id} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => { if (isCompleted || isActive) setActiveStep(step.id); }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 transition-all w-full',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : isCompleted
                      ? 'border-success/30 bg-success/5 cursor-pointer'
                      : 'border-border opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                      isActive ? 'bg-primary text-primary-foreground'
                        : isCompleted ? 'bg-success text-success-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className={cn('text-sm font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: ROLES */}
        {activeStep === 'roles' && (
          <motion.div
            key="roles"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Define Team Roles
                    </CardTitle>
                    <CardDescription>
                      Create custom roles and assign an access level to each. Access levels control what users can do.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setShowAddRole(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Access Level Legend */}
                <div className="mb-6 rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Access Levels</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ACCESS_LEVELS.map((level) => (
                      <div key={level.value} className="flex items-start gap-2">
                        {getAccessBadge(level.value)}
                        <p className="text-xs text-muted-foreground">{level.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {roles.length === 0 && !showAddRole ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No roles defined yet. Create roles like Product Owner, Developer, QA, etc.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => setShowAddRole(true)}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Your First Role
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {roles.map((role) => (
                        <motion.div
                          key={role.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center justify-between rounded-lg border bg-card p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                              <Shield className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">{role.name}</p>
                              {role.description && (
                                <p className="text-xs text-muted-foreground">{role.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getAccessBadge(role.access_level)}
                            <Select
                              value={role.access_level}
                              onValueChange={(val) => projectId && updateRole(projectId, role.id, { access_level: val as AccessLevel })}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACCESS_LEVELS.map((lvl) => (
                                  <SelectItem key={lvl.value} value={lvl.value}>
                                    {lvl.label} — {lvl.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => projectId && deleteRole(projectId, role.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {showAddRole && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4"
                      >
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <Label>Role Name</Label>
                              <Input
                                placeholder="e.g. Developer, QA..."
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Description</Label>
                              <Input
                                placeholder="Optional description"
                                value={newRoleDesc}
                                onChange={(e) => setNewRoleDesc(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Access Level</Label>
                              <Select value={newRoleAccess} onValueChange={(v) => setNewRoleAccess(v as AccessLevel)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACCESS_LEVELS.map((lvl) => (
                                    <SelectItem key={lvl.value} value={lvl.value}>
                                      {lvl.label} ({lvl.value})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleAddRole} disabled={!newRoleName.trim() || creatingRole}>
                              {creatingRole && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                              Add Role
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setShowAddRole(false); setNewRoleName(''); setNewRoleDesc(''); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setActiveStep('workflow')} disabled={!canProceedFromRoles}>
                Continue to Workflow
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: WORKFLOW */}
        {activeStep === 'workflow' && (
          <motion.div
            key="workflow"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  Define Workflow Stages
                </CardTitle>
                <CardDescription>
                  Define the task lifecycle for your project. The AI agent will use these stages to automatically transition tasks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Presets */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Presets</p>
                  <div className="flex flex-wrap gap-2">
                    {WORKFLOW_PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleApplyPreset(preset.stages)}
                        disabled={applyingPreset}
                      >
                        <GitBranch className="mr-1.5 h-3 w-3" />
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Stage List */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Workflow Pipeline ({workflowStages.length} stages)
                  </p>
                  {applyingPreset ? (
                    <div className="flex flex-col items-center py-8 text-center bg-card rounded-lg border">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Applying preset pipeline...</p>
                    </div>
                  ) : workflowStages.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Workflow className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No stages defined. Use a preset or add stages manually.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workflowStages.map((stage, i) => (
                        <div
                          key={stage.id}
                          className="flex items-center gap-3 rounded-lg border bg-card p-3"
                        >
                          <div className="flex flex-col gap-0.5 mr-1">
                            <button 
                              onClick={() => handleMoveStage(i, 'up')} 
                              disabled={i === 0}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={() => handleMoveStage(i, 'down')} 
                              disabled={i === workflowStages.length - 1}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{stage.name}</p>
                          </div>
                          {stage.is_terminal && (
                            <Badge variant="outline" className="text-xs border-success/30 text-success">
                              Terminal
                            </Badge>
                          )}
                          {i === workflowStages.length - 1 && !stage.is_terminal && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Last stage
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive/60 hover:text-destructive"
                            onClick={() => projectId && deleteWorkflowStage(projectId, stage.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {/* Visual flow arrow */}
                      <div className="flex items-center gap-2 px-3 py-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">↑ Start → End ↓</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Stage */}
                <div className="flex gap-3">
                  <Input
                    placeholder="Add new stage (e.g. QA Testing)"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                  />
                  <Button onClick={handleAddStage} disabled={!newStageName.trim() || creatingStage} size="sm">
                    {creatingStage ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Plus className="mr-1.5 h-3 w-3" />}
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveStep('roles')}>
                Back to Roles
              </Button>
              <Button onClick={() => setActiveStep('teams')} disabled={!canProceedFromWorkflow}>
                Continue to Teams
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: TEAMS */}
        {activeStep === 'teams' && (
          <motion.div
            key="teams"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Create Teams
                </CardTitle>
                <CardDescription>
                  Organize your members into teams. Each team can have its own board and backlog.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="text-sm font-medium mb-3">Add a New Team</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="team-name">Team Name</Label>
                      <Input
                        id="team-name"
                        placeholder="e.g. Frontend Team, Marketing..."
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleCreateTeam} disabled={!newTeamName.trim() || creatingTeam}>
                        {creatingTeam ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                        Create Team
                      </Button>
                    </div>
                  </div>
                </div>

                {visibleTeams.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" />
                      Project Teams ({visibleTeams.length})
                    </h4>
                    <div className="space-y-2">
                      {visibleTeams.map((team) => (
                        <div key={team.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Users className="h-4 w-4" />
                            </div>
                            {editingTeamId === team.id ? (
                              <div className="flex items-center gap-2">
                                <Input 
                                  value={editTeamName} 
                                  onChange={(e) => setEditTeamName(e.target.value)}
                                  className="h-8"
                                  autoFocus
                                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateTeamName(team.id)}
                                />
                                <Button size="sm" onClick={() => handleUpdateTeamName(team.id)}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingTeamId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-medium text-foreground">{team.name}</p>
                                <p className="text-xs text-muted-foreground">Team ID: {team.id}</p>
                              </div>
                            )}
                          </div>
                          {editingTeamId !== team.id && (
                            <Button variant="ghost" size="sm" onClick={() => { setEditingTeamId(team.id); setEditTeamName(team.name); }}>
                              Rename
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveStep('workflow')}>
                Back to Workflow
              </Button>
              <Button onClick={handleFinishSetup}>
                Finish Setup & Go to Board
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
