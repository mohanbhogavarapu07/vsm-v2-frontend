import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectStore, PREDEFINED_PERMISSIONS, Role } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
  Pencil,
  Mail,
  ArrowRight,
  FolderKanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const STEPS = [
  { id: 'roles', label: 'Define Roles', icon: Shield, description: 'Create custom roles for your team' },
  { id: 'permissions', label: 'Set Permissions', icon: ShieldCheck, description: 'Assign permissions to each role' },
  { id: 'invite', label: 'Invite Team', icon: UserPlus, description: 'Invite members and assign roles' },
] as const;

type StepId = typeof STEPS[number]['id'];

export default function ProjectSetupPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    currentProject,
    roles,
    members,
    loading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    fetchMembers,
    inviteMember,
    setCurrentProject,
  } = useProjectStore();

  const [activeStep, setActiveStep] = useState<StepId>('roles');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchRoles(projectId);
      fetchMembers(projectId);
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
        permissions: ['read'], // default permission
      });
      setNewRoleName('');
      setNewRoleDesc('');
      setShowAddRole(false);
    } catch {
      // handled
    } finally {
      setCreatingRole(false);
    }
  };

  const handleTogglePermission = async (role: Role, permKey: string) => {
    if (!projectId) return;
    const current = role.permissions || [];
    const updated = current.includes(permKey)
      ? current.filter((p) => p !== permKey)
      : [...current, permKey];
    await updateRole(projectId, role.id, { permissions: updated });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteRoleId || !projectId) return;
    setInviting(true);
    try {
      await inviteMember(projectId, inviteEmail.trim(), inviteRoleId);
      setInviteEmail('');
      setInviteRoleId('');
    } catch {
      // handled
    } finally {
      setInviting(false);
    }
  };

  const handleFinishSetup = async () => {
    if (!projectId) return;
    try {
      await api.updateProject(projectId, { setup_complete: true });
      navigate(`/projects/${projectId}/board`);
    } catch {
      navigate(`/projects/${projectId}/board`);
    }
  };

  const canProceedFromRoles = roles.length > 0;
  const canProceedFromPermissions = roles.every((r) => r.permissions && r.permissions.length > 0);

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <FolderKanban className="h-4 w-4" />
          <span>{currentProject?.name || 'Project'}</span>
          <ChevronRight className="h-3 w-3" />
          <span>Team Setup</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Set Up Your Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define roles, assign permissions, and invite your team members
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
                  onClick={() => {
                    if (isCompleted || isActive) setActiveStep(step.id);
                  }}
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
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-success text-success-foreground'
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

      {/* Step Content */}
      <AnimatePresence mode="wait">
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
                      Create custom roles for your project. Each role will have specific permissions.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setShowAddRole(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {roles.length === 0 && !showAddRole ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No roles defined yet. Start by adding roles like Product Owner, Developer, QA, etc.
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
                            {role.permissions && role.permissions.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
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
                          <div className="space-y-1.5">
                            <Label>Role Name</Label>
                            <Input
                              placeholder="e.g. Product Owner, Developer, QA..."
                              value={newRoleName}
                              onChange={(e) => setNewRoleName(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Description (optional)</Label>
                            <Input
                              placeholder="Brief description of this role's responsibility"
                              value={newRoleDesc}
                              onChange={(e) => setNewRoleDesc(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleAddRole} disabled={!newRoleName.trim() || creatingRole}>
                              {creatingRole && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                              Add Role
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowAddRole(false);
                                setNewRoleName('');
                                setNewRoleDesc('');
                              }}
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
              <Button onClick={() => setActiveStep('permissions')} disabled={!canProceedFromRoles}>
                Continue to Permissions
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {activeStep === 'permissions' && (
          <motion.div
            key="permissions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Assign Permissions
                </CardTitle>
                <CardDescription>
                  Configure what each role can do. Check the permissions you want to grant to each role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 pr-4 text-left font-medium text-muted-foreground min-w-[180px]">
                          Permission
                        </th>
                        {roles.map((role) => (
                          <th key={role.id} className="px-3 py-3 text-center font-medium text-foreground min-w-[100px]">
                            <div className="flex flex-col items-center gap-1">
                              <Shield className="h-4 w-4 text-primary" />
                              <span className="text-xs">{role.name}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PREDEFINED_PERMISSIONS.map((perm) => (
                        <tr key={perm.key} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 pr-4">
                            <div>
                              <p className="font-medium text-foreground">{perm.label}</p>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            </div>
                          </td>
                          {roles.map((role) => (
                            <td key={role.id} className="px-3 py-3 text-center">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={role.permissions?.includes(perm.key)}
                                  onCheckedChange={() => handleTogglePermission(role, perm.key)}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveStep('roles')}>
                Back to Roles
              </Button>
              <Button onClick={() => setActiveStep('invite')} disabled={!canProceedFromPermissions}>
                Continue to Invite
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {activeStep === 'invite' && (
          <motion.div
            key="invite"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Invite Team Members
                </CardTitle>
                <CardDescription>
                  Invite users by email and assign them a role. They'll get access based on the role's permissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invite Form */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="invite-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="colleague@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="sm:w-48 space-y-1.5">
                      <Label>Role</Label>
                      <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleInvite}
                        disabled={!inviteEmail.trim() || !inviteRoleId || inviting}
                      >
                        {inviting ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="mr-1.5 h-4 w-4" />
                        )}
                        Invite
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Members List */}
                {members.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Invited Members ({members.length})
                    </h4>
                    <div className="space-y-2">
                      {members.map((member) => {
                        const memberRole = roles.find((r) => r.id === member.role_id);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between rounded-lg border bg-card p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                {member.full_name?.[0]?.toUpperCase() || member.email[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {member.full_name || member.email}
                                </p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {memberRole?.name || 'No role'}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  member.status === 'ACTIVE'
                                    ? 'border-success/30 text-success'
                                    : member.status === 'INVITED'
                                    ? 'border-warning/30 text-warning'
                                    : 'border-destructive/30 text-destructive'
                                )}
                              >
                                {member.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveStep('permissions')}>
                Back to Permissions
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
