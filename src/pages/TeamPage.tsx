import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore, ACCESS_LEVELS, Role, AccessLevel } from '@/stores/projectStore';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  GitBranch,
  Github,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function TeamPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    currentTeamId,
    roles,
    members,
    loading,
    fetchRoles,
    fetchMembers,
    ensureDefaultTeam,
    createRole,
    updateRole,
    deleteRole,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = useProjectStore();
  const { canManageTeam, canManageRoles, isProjectOwner } = usePermissions();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleAccess, setNewRoleAccess] = useState<AccessLevel>('LOW');
  const [creatingRole, setCreatingRole] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  // GitHub Integration State
  const [linkedRepos, setLinkedRepos] = useState<any[]>([]);
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [linkingRepo, setLinkingRepo] = useState<number | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchRoles(projectId);
      fetchMembers(projectId);
      loadGitHubData();
    }
  }, [projectId, currentTeamId]);

  // Handle callback status from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'github_success') {
      toast.success('GitHub integration completed successfully!');
      loadGitHubData();
      
      // Clean up URL
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('status');
      const newUrl = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    } else if (params.get('status') === 'github_error') {
      toast.error('GitHub integration failed. Please try again.');
      
      // Clean up URL
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('status');
      const newUrl = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [projectId, currentTeamId]);

  const loadGitHubData = async () => {
    const teamId = currentTeamId || (projectId ? await ensureDefaultTeam(projectId) : null);
    if (!teamId) return;

    setLoadingRepos(true);
    try {
      const [linked, available] = await Promise.all([
        api.getTeamGitHubRepositories(teamId),
        api.listGitHubRepositories(teamId)
      ]);
      setLinkedRepos(linked);
      // Filter out already linked repos from available list if needed, or just show all
      setAvailableRepos(available.filter(r => !r.teamId));
    } catch (err) {
      console.error('Failed to load GitHub data', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleConnectGitHub = async () => {
    try {
      const { url } = await api.getGitHubInstallUrl(currentTeamId || undefined, window.location.origin);
      // Redirect in the same window for a seamless callback flow
      window.location.href = url;
    } catch (err) {
      toast.error('Failed to get installation URL');
    }
  };

  const handleLinkRepo = async (repoId: number) => {
    const teamId = currentTeamId;
    if (!teamId) return;

    setLinkingRepo(repoId);
    try {
      await api.linkGitHubRepository(teamId, repoId);
      toast.success('Repository linked successfully');
      await loadGitHubData();
    } catch (err) {
      toast.error('Failed to link repository');
    } finally {
      setLinkingRepo(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteRoleId || !projectId) return;
    setInviting(true);
    try {
      await inviteMember(projectId, inviteEmail.trim(), inviteRoleId);
      setInviteEmail('');
      setInviteRoleId('');
      toast.success('Invitation sent');
    } catch {} finally {
      setInviting(false);
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
      toast.success('Role created');
    } catch {} finally {
      setCreatingRole(false);
    }
  };

  const canManage = canManageTeam || isProjectOwner;
  const canEditRoles = canManageRoles || isProjectOwner;

  const getAccessBadge = (level: AccessLevel) => {
    const colorClass =
      level === 'HIGH' ? 'border-destructive/30 text-destructive bg-destructive/10' :
      level === 'MEDIUM' ? 'border-warning/30 text-warning bg-warning/10' :
      'border-muted-foreground/30 text-muted-foreground bg-muted';
    const info = ACCESS_LEVELS.find((a) => a.value === level);
    return (
      <Badge variant="outline" className={cn('text-xs', colorClass)}>
        {info?.label || level}
      </Badge>
    );
  };

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage roles, access levels, and team members
        </p>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" /> Members
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" /> Roles & Access
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <GitBranch className="h-4 w-4" /> Integrations
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {canManage && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Invite Member</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                    <SelectTrigger className="sm:w-48">
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
                  <Button onClick={handleInvite} disabled={!inviteEmail.trim() || !inviteRoleId || inviting}>
                    {inviting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                    Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">No team members yet</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => {
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
                          {memberRole && getAccessBadge(memberRole.access_level)}
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              member.status === 'ACTIVE' ? 'border-success/30 text-success' :
                              member.status === 'INVITED' ? 'border-warning/30 text-warning' :
                              'border-destructive/30 text-destructive'
                            )}
                          >
                            {member.status}
                          </Badge>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {roles.map((r) => (
                                  <DropdownMenuItem
                                    key={r.id}
                                    onClick={() => projectId && updateMemberRole(projectId, member.id, r.id)}
                                    className={cn(member.role_id === r.id && 'bg-accent')}
                                  >
                                    <Shield className="mr-2 h-3 w-3" />
                                    Set as {r.name}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setRemoveMemberId(member.id)}
                                >
                                  <UserMinus className="mr-2 h-3 w-3" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          {canEditRoles && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowAddRole(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Role
              </Button>
            </div>
          )}

          {showAddRole && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Role Name</Label>
                      <Input
                        placeholder="e.g. Tech Lead"
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
                      Create Role
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddRole(false); setNewRoleName(''); setNewRoleDesc(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Roles List with Access Levels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Roles & Access Levels
              </CardTitle>
              <CardDescription>
                Each role maps to an access level that controls capabilities across the project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="mb-4 rounded-lg border bg-muted/30 p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  {ACCESS_LEVELS.map((lvl) => (
                    <div key={lvl.value} className="flex items-start gap-2">
                      {getAccessBadge(lvl.value)}
                      <p className="text-xs text-muted-foreground">{lvl.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {roles.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">Create roles to manage team access</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{role.name}</p>
                          {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEditRoles ? (
                          <Select
                            value={role.access_level}
                            onValueChange={(val) => projectId && updateRole(projectId, role.id, { access_level: val as AccessLevel })}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
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
                        ) : (
                          getAccessBadge(role.access_level)
                        )}
                        {canEditRoles && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive/60 hover:text-destructive"
                            onClick={() => setDeleteRoleId(role.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* GitHub Connect */}
            <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#24292e] text-white">
                      <Github className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">GitHub App</CardTitle>
                      <CardDescription>Direct integration via GitHub App</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={loadGitHubData} disabled={loadingRepos}>
                    <RefreshCw className={cn("h-4 w-4", loadingRepos && "animate-spin")} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Install our GitHub App on your account or organization to allow VSM to track commits, PRs, and branch activities.
                </p>
                <Button variant="outline" className="w-full gap-2" onClick={handleConnectGitHub}>
                  <ExternalLink className="h-4 w-4" />
                  Install / Manage GitHub App
                </Button>
              </CardContent>
            </Card>

            {/* Linked Repositories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  Linked Repositories
                </CardTitle>
                <CardDescription>Repositories linked to this team</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRepos ? (
                  <div className="flex flex-col items-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : linkedRepos.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">No repositories linked yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedRepos.map((repo) => (
                      <div key={repo.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{repo.fullName}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-success border-success/30">Active</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Repository Linking */}
          {availableRepos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Available Repositories</CardTitle>
                <CardDescription>Select a repository to link it to this team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableRepos.map((repo) => (
                    <div key={repo.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-medium truncate">{repo.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{repo.fullName}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 shrink-0"
                        onClick={() => handleLinkRepo(repo.id)}
                        disabled={linkingRepo === repo.id}
                      >
                        {linkingRepo === repo.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Link'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteRoleId} onOpenChange={() => setDeleteRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the role and unassign it from all members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { if (deleteRoleId && projectId) deleteRole(projectId, deleteRoleId); setDeleteRoleId(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeMemberId} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member from the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { if (removeMemberId && projectId) removeMember(projectId, removeMemberId); setRemoveMemberId(null); }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
