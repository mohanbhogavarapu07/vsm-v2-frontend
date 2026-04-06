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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
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
    stages: [
      { name: 'Backlog', category: 'BACKLOG', is_terminal: false },
      { name: 'To Do', category: 'ACTIVE', is_terminal: false },
      { name: 'In Progress', category: 'ACTIVE', is_terminal: false },
      { name: 'Code Review', category: 'REVIEW', is_terminal: false },
      { name: 'Testing', category: 'VALIDATION', is_terminal: false },
      { name: 'Done', category: 'DONE', is_terminal: true },
    ],
  },
  {
    name: 'Simple Kanban',
    stages: [
      { name: 'To Do', category: 'BACKLOG', is_terminal: false },
      { name: 'In Progress', category: 'ACTIVE', is_terminal: false },
      { name: 'Done', category: 'DONE', is_terminal: true },
    ],
  },
  {
    name: 'Full Pipeline',
    stages: [
      { name: 'Backlog', category: 'BACKLOG', is_terminal: false },
      { name: 'Development', category: 'ACTIVE', is_terminal: false },
      { name: 'Code Review', category: 'REVIEW', is_terminal: false },
      { name: 'QA', category: 'VALIDATION', is_terminal: false },
      { name: 'UAT', category: 'VALIDATION', is_terminal: false },
      { name: 'Deployment', category: 'ACTIVE', is_terminal: false },
      { name: 'Done', category: 'DONE', is_terminal: true },
    ],
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
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  const { deleteTeam } = useProjectStore(); // Destructure deleteTeam from store

  useEffect(() => {
    if (projectId) {
      fetchRoles(projectId);
      fetchTeams(projectId);
      fetchWorkflowStages(projectId);
      if (!currentProject) {
        api.getProject(projectId)
          .then((p) => setCurrentProject(p))
          .catch((err) => console.error('Failed to auto-fetch project details', err));
      }
    }
  }, [projectId]);

  const stepIndex = STEPS.findIndex((s) => s.id === activeStep);

  const handleDeleteTeam = async (teamId: string) => {
    if (!projectId || !currentProject) return;
    
    // Prevent accidental deletion of the last team
    if (teams.length <= 1) {
      toast.error('Cannot delete the last team in a project');
      return;
    }

    setDeletingTeamId(teamId);
    try {
      await deleteTeam(projectId, teamId);
      toast.success('Team deleted successfully');
    } catch (e: any) {
      console.error('Failed to delete team:', e);
      toast.error(e.message || 'Failed to delete team');
    } finally {
      setDeletingTeamId(null);
    }
  };

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
    } catch (err) {
      console.error('Failed to create role:', err);
    } finally {
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
    } catch (err) {
      console.error('Failed to add stage:', err);
    } finally {
      setCreatingStage(false);
    }
  };

  const handleApplyPreset = async (stages: any[]) => {
    if (!projectId) return;
    setApplyingPreset(true);
    try {
      // Delete existing stages in parallel
      await Promise.all(workflowStages.map((s) => deleteWorkflowStage(projectId, s.id)));
      
      // Create new stages in parallel
      await Promise.all(
        stages.map((stage, i) =>
          createWorkflowStage(projectId, {
            name: stage.name,
            category: stage.category,
            stage_order: i,
            is_terminal: stage.is_terminal,
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
    if (!newTeamName.trim() || !projectId) return;
    setCreatingTeam(true);
    try {
      await createTeam(projectId, { name: newTeamName.trim() });
      setNewTeamName('');
    } catch (err) {
      console.error('Failed to create team:', err);
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleUpdateTeamName = async (teamId: string) => {
    if (!editTeamName.trim() || !projectId) return;
    try {
      await updateTeamName(teamId, editTeamName.trim());
      setEditingTeamId(null);
      setEditTeamName('');
    } catch (err) {
      console.error('Failed to update team name:', err);
    }
  };

  const handleFinishSetup = async () => {
    if (!projectId) return;
    try {
      await useProjectStore.getState().completeProjectSetup(projectId);
      // route to the board of the first team found
      if (teams.length > 0) {
        navigate(`/projects/${projectId}/teams/${teams[0].id}/board`);
      } else {
        navigate(`/projects/${projectId}`);
      }
    } catch (err) {
      console.error('Failed to complete project setup', err);
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

  const [savingStep, setSavingStep] = useState<StepId | null>(null);

  const handleSaveStep = (step: StepId) => {
    setSavingStep(step);
    // Mimic API latency for a "good" UX feel as background syncing is already happening
    setTimeout(() => {
      setSavingStep(null);
      toast.success(`${step.charAt(0).toUpperCase() + step.slice(1)} changes saved successfully!`, {
        description: "Your project configuration has been updated.",
        position: 'top-right'
      });
    }, 800);
  };

  const isConfigMode = currentProject?.setupComplete ?? false;

  return (
    <div className={cn(
      "min-h-screen bg-background transition-all duration-500",
      isConfigMode ? "px-0" : "mx-auto max-w-4xl p-6 lg:p-8"
    )}>
      {/* Header Area */}
      <div className={cn(
        "mb-0",
        isConfigMode ? "border-b bg-card/30 backdrop-blur-md sticky top-0 z-10 px-8 pt-6" : "mb-8"
      )}>
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70 mb-3 tracking-wide uppercase">
          <span className="hover:text-primary cursor-pointer transition-colors">Projects</span>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span className="text-foreground/80">{currentProject?.name || 'Project'}</span>
        </div>

        {/* Title & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {currentProject?.name}
                {isConfigMode && (
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-widest h-5 px-1.5 bg-muted/50 text-muted-foreground border-none">
                    Config
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {isConfigMode ? 'Project Administration & Compliance' : 'Initial Workspace Setup'}
              </p>
            </div>
          </div>

          {isConfigMode && (
             <div className="flex items-center gap-3">
               <Button 
                 variant="outline" 
                 size="sm" 
                 className="h-9 px-4 rounded-lg border-primary/20 hover:bg-primary/5 text-primary"
                 onClick={() => {
                  const firstTeam = teams[0]?.id;
                  if (firstTeam) {
                    navigate(`/projects/${projectId}/teams/${firstTeam}/board`);
                  } else {
                    toast.error('No teams found in this project');
                  }
                }}
               >
                 View Board
               </Button>
               <Button 
                onClick={() => handleSaveStep(activeStep)} 
                disabled={savingStep === activeStep}
                className="h-9 px-4 rounded-lg shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
               >
                {savingStep === activeStep ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>Save Changes</span>
                  </div>
                )}
               </Button>
             </div>
          )}
        </div>

        {/* Dashboard Navigation Bar (Horizontal Tab Style) */}
        {isConfigMode && (
          <div className="flex items-center border-b -mx-8 px-8 gap-1">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "relative flex items-center gap-2.5 px-4 py-3 text-sm font-semibold transition-all duration-200",
                    isActive 
                      ? "text-primary border-b-2 border-primary bg-primary/5 mr-0" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 mr-0"
                  )}
                >
                  <step.icon className={cn("h-4 w-4", isActive ? "text-primary" : "opacity-60")} />
                  {step.label}
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab" 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" 
                    />
                  )}
                </button>
              );
            })}
            <div className="flex-1" />
            <div className="flex items-center gap-4 text-muted-foreground/40 mr-2">
              <Separator orientation="vertical" className="h-4" />
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-transparent">
                <Plus className="h-4 w-4 opacity-40" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className={cn(
        "space-y-6",
        isConfigMode ? "p-8 max-w-6xl mx-auto" : "pb-20"
      )}>
        {/* Navigation Stepper (Only for Wizard Mode) */}
        {!isConfigMode && (
          <div className="mb-10">
            <div className="flex items-center gap-2">
              {STEPS.map((step, i) => {
                const isActive = step.id === activeStep;
                const isCompleted = i < stepIndex;
                return (
                  <div key={step.id} className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => { if (isCompleted || isActive) setActiveStep(step.id); }}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-4 transition-all w-full text-left',
                        isActive
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                          : isCompleted
                          ? 'border-success/30 bg-success/5 cursor-pointer hover:border-success/50'
                          : 'border-border opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                          isActive ? 'bg-primary text-primary-foreground'
                            : isCompleted ? 'bg-success text-success-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                      </div>
                      <div className="hidden sm:block">
                        <p className={cn('text-sm font-bold leading-none mb-1', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                          {step.label}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{step.description.split(' ')[0]}</p>
                      </div>
                    </button>
                    {i < STEPS.length - 1 && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 mx-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-6 pb-20">
        <AnimatePresence mode="wait">
        {/* STEP 1: ROLES */}
        {(activeStep as string) === 'roles' && (
          <motion.div
            key="roles"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Role Registry
                    <Badge variant="outline" className="ml-2 font-normal text-[10px] px-1 h-4">{roles.length}</Badge>
                  </h2>
                  {!showAddRole && (
                    <Button variant="outline" size="sm" onClick={() => setShowAddRole(true)} className="h-8 border-dashed hover:border-primary">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Define New Role
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <div className="grid grid-cols-12 bg-muted/30 px-4 py-2 border-b text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    <div className="col-span-1">Icon</div>
                    <div className="col-span-4">Role Name & Desc</div>
                    <div className="col-span-4 text-center">Permit Level</div>
                    <div className="col-span-3 text-right">Actions</div>
                  </div>
                  
                  {roles.length === 0 && !showAddRole ? (
                    <div className="flex flex-col items-center py-16 text-center">
                      <Shield className="h-16 w-16 text-muted-foreground/10 mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">No enterprise roles defined.</p>
                      <Button variant="default" size="sm" onClick={() => setShowAddRole(true)}>
                        Create First Role
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      <AnimatePresence initial={false}>
                        {roles.map((role) => (
                          <motion.div
                            key={role.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-12 items-center px-4 py-3 hover:bg-muted/20 transition-colors group"
                          >
                            <div className="col-span-1">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary group-hover:scale-110 transition-transform">
                                <Shield className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="col-span-4">
                              <p className="font-bold text-sm">{role.name}</p>
                              {role.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{role.description}</p>
                              )}
                            </div>
                            <div className="col-span-4 flex justify-center">
                              {getAccessBadge(role.access_level)}
                            </div>
                            <div className="col-span-3 flex justify-end gap-1 transition-opacity">
                              <Select
                                value={role.access_level}
                                onValueChange={(val) => projectId && updateRole(projectId, role.id, { access_level: val as AccessLevel })}
                              >
                                <SelectTrigger className="w-24 h-7 text-[10px] bg-transparent border-none hover:bg-muted font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACCESS_LEVELS.map((lvl) => (
                                    <SelectItem key={lvl.value} value={lvl.value} className="text-xs">
                                      {lvl.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/5"
                                onClick={() => projectId && deleteRole(projectId, role.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {showAddRole && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border bg-primary/5 p-5 border-primary/20 shadow-inner"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <h3 className="text-sm font-bold">New Role Definition</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Internal Label</Label>
                        <Input
                          placeholder="e.g. Lead Engineer"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          className="h-9 bg-background"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Scope Detail</Label>
                        <Input
                          placeholder="What is this role's purpose?"
                          value={newRoleDesc}
                          onChange={(e) => setNewRoleDesc(e.target.value)}
                          className="h-9 bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Clearance</Label>
                        <Select value={newRoleAccess} onValueChange={(v) => setNewRoleAccess(v as AccessLevel)}>
                          <SelectTrigger className="h-9 bg-background font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCESS_LEVELS.map((lvl) => (
                              <SelectItem key={lvl.value} value={lvl.value}>
                                {lvl.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                       <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8"
                        onClick={() => { setShowAddRole(false); setNewRoleName(''); setNewRoleDesc(''); }}
                      >
                        Discard
                      </Button>
                      <Button size="sm" onClick={handleAddRole} disabled={!newRoleName.trim() || creatingRole} className="h-8 px-5">
                        {creatingRole ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm Role'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground opacity-60">Security Framework</h3>
                <Card className="border-none bg-muted/30 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      RBAC Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ACCESS_LEVELS.map((level) => (
                      <div key={level.value} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                           {getAccessBadge(level.value)}
                           <span className="text-[10px] font-bold text-foreground/70">{level.label} Scope</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-2 border-l border-primary/20">
                          {level.description}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {!isConfigMode && (
              <div className="flex justify-end pt-6 border-t">
                <Button onClick={() => setActiveStep('workflow')} disabled={!canProceedFromRoles} className="rounded-xl px-6">
                  Verify Workflow Stages
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 2: WORKFLOW */}
        {(activeStep as string) === 'workflow' && (
          <motion.div
            key="workflow"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground opacity-60">Config Presets</h3>
                <div className="flex flex-col gap-2">
                  {WORKFLOW_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      className="justify-start h-10 px-4 text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 transition-all"
                      onClick={() => handleApplyPreset(preset.stages)}
                      disabled={applyingPreset}
                    >
                      <GitBranch className="mr-2 h-3.5 w-3.5 text-primary" />
                      {preset.name}
                    </Button>
                  ))}
                </div>
                
                <div className="pt-4 border-t">
                   <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                     * Presets will overwrite your current configuration. Use with caution in active projects.
                   </p>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between mb-4">
                   <h2 className="text-lg font-bold flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    Task Lifecycle Pipeline
                    <Badge variant="outline" className="ml-2 font-normal text-[10px] px-1 h-4">{workflowStages.length}</Badge>
                  </h2>
                </div>

                <div className="space-y-2 relative">
                  {/* Pipeline visualization background line */}
                  <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent" />
                  
                  {applyingPreset ? (
                    <div className="flex flex-col items-center py-20 text-center rounded-xl border bg-muted/20 border-dashed">
                      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50 mb-3" />
                      <p className="text-sm font-bold text-muted-foreground">Reconfiguring Pipeline Stages...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {workflowStages.map((stage, i) => (
                          <motion.div
                            key={stage.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                          >
                            <div className="z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary ring-4 ring-background text-[10px] font-bold text-primary-foreground shadow-sm">
                              {i + 1}
                            </div>
                            
                            <div className="flex-1">
                              <p className="text-sm font-bold text-foreground">{stage.name}</p>
                              {stage.is_terminal && (
                                <p className="text-[10px] text-success font-bold uppercase tracking-tighter mt-0.5">Terminal Completion Stage</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:bg-muted"
                                onClick={() => handleMoveStage(i, 'up')}
                                disabled={i === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:bg-muted"
                                onClick={() => handleMoveStage(i, 'down')}
                                disabled={i === workflowStages.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Separator orientation="vertical" className="h-4 mx-1" />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/5"
                                onClick={() => projectId && deleteWorkflowStage(projectId, stage.id)}
                                disabled={workflowStages.length <= 2}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      <div className="flex gap-2 p-1.5 bg-muted/30 rounded-xl mt-4 border border-dashed border-muted-foreground/30">
                        <Input
                          placeholder="Inject New Pipeline Stage..."
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                          className="h-9 bg-transparent border-none placeholder:text-[10px] placeholder:uppercase placeholder:font-bold focus-visible:ring-0"
                        />
                        <Button 
                          onClick={handleAddStage} 
                          disabled={!newStageName.trim() || creatingStage} 
                          size="sm" 
                          className="h-8 px-4 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95"
                        >
                          {creatingStage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                          Add Stage
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isConfigMode && (
              <div className="flex justify-between pt-6 border-t">
                <Button variant="ghost" onClick={() => setActiveStep('roles')} className="rounded-xl">
                  Back to Roles
                </Button>
                <Button onClick={() => setActiveStep('teams')} disabled={!canProceedFromWorkflow} className="rounded-xl px-6">
                  Finalize Teams
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 3: TEAMS */}
        {(activeStep as string) === 'teams' && (
          <motion.div
            key="teams"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground opacity-60">Operations</h3>
                <div className="rounded-xl border bg-muted/10 p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-extrabold tracking-widest text-primary/70">New Deployment</Label>
                    <Input
                      placeholder="Squad / Team Name"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                      className="h-9 bg-background font-bold text-xs"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateTeam} 
                    disabled={!newTeamName.trim() || creatingTeam}
                    className="w-full h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                  >
                    {creatingTeam ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Provision Team
                  </Button>
                </div>
                
                <div className="rounded-xl border border-dashed p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Provisioned teams gain access to shared project resources and global workflow stages.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4">
                 <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  Team Organizations
                  <Badge variant="outline" className="ml-2 font-normal text-[10px] px-1 h-4">{teams.length}</Badge>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence initial={false}>
                    {teams.map((team) => (
                      <motion.div
                        key={team.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="group relative rounded-2xl border bg-card p-5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary ring-1 ring-primary/20 group-hover:scale-110 transition-transform">
                            <Users className="h-6 w-6" />
                          </div>
                          
                          <div className="flex items-center gap-2 transition-opacity">
                             <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTeam(team.id)}
                                disabled={deletingTeamId === team.id}
                                className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/5"
                              >
                                {deletingTeamId === team.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                          </div>
                        </div>

                        {editingTeamId === team.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input 
                              value={editTeamName} 
                              onChange={(e) => setEditTeamName(e.target.value)}
                              className="h-8 font-bold"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTeamName(team.id)}
                            />
                            <Button size="sm" className="h-8 text-[10px]" onClick={() => handleUpdateTeamName(team.id)}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-8 text-[10px]" onClick={() => setEditingTeamId(null)}>Esc</Button>
                          </div>
                        ) : (
                          <div onClick={() => { setEditingTeamId(team.id); setEditTeamName(team.name); }} className="cursor-text">
                            <p className="text-md font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors underline-offset-4 decoration-primary/30 group-hover:underline">{team.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-60">ID: {team.id}</p>
                          </div>
                        )}
                        
                        <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-between">
                            <div className="flex -space-x-2">
                               <div className="h-6 w-6 rounded-full border-2 border-background bg-muted text-[8px] flex items-center justify-center font-bold">AI</div>
                               <div className="h-6 w-6 rounded-full border-2 border-background bg-primary/10 text-primary text-[8px] flex items-center justify-center font-bold">+</div>
                            </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {!isConfigMode && (
              <div className="flex justify-between pt-6 border-t">
                <Button variant="ghost" onClick={() => setActiveStep('workflow')} className="rounded-xl">
                  Back to Workflow
                </Button>
                <Button onClick={handleFinishSetup} className="rounded-xl px-10 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold">
                  Finalize Setup & Launch
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  );
}
