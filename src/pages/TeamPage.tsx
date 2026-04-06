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
  const [showRepoSelector, setShowRepoSelector] = useState(false);

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

          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground">
                    <Users className="h-5 w-5 text-primary/80" />
                    Team Members
                    <Badge variant="secondary" className="ml-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-none">
                      {members.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-muted-foreground/80 font-inter">
                    Manage permissions and member access for this project team
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-muted/50 bg-muted/5">
                  <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Your team is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 uppercase tracking-wider font-semibold">Invite members to collaborate</p>
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
                    const avatarColorClass = avatarColors[colorIndex];

                    return (
                      <motion.div
                        key={member.id}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        className="group relative flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all duration-200 hover:border-primary/30 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08)]"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold shadow-sm ring-4 ring-background transition-transform duration-200 group-hover:scale-105",
                            avatarColorClass
                          )}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {member.full_name || member.email.split('@')[0]}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="h-3 w-3 text-muted-foreground/60" />
                              <p className="text-xs text-muted-foreground font-medium truncate">{member.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className="h-6 rounded-full px-2.5 py-0 text-[10px] font-bold uppercase tracking-wider bg-secondary/30 text-secondary-foreground border-transparent border-none"
                            >
                              {memberRole?.name || 'No Role'}
                            </Badge>
                            {memberRole && getAccessBadge(memberRole.access_level)}
                            <Badge
                              variant="outline"
                              className={cn(
                                'h-6 rounded-full px-2.5 py-0 text-[10px] font-bold uppercase tracking-wider border-none',
                                member.status === 'ACTIVE' 
                                  ? 'bg-success/10 text-success' 
                                  : member.status === 'INVITED' 
                                  ? 'bg-warning/10 text-warning' 
                                  : 'bg-destructive/10 text-destructive font-semibold'
                              )}
                            >
                              {member.status}
                            </Badge>
                          </div>
                          
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 p-1.5">
                                <div className="px-2 py-1.5 mb-1.5">
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
                                  onClick={() => setRemoveMemberId(member.id)}
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
          {linkedRepos.length > 0 && !showRepoSelector ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-primary" />
                      Connected Repository
                    </CardTitle>
                    <CardDescription>The strictly linked GitHub repository for this team</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={loadGitHubData} disabled={loadingRepos}>
                    <RefreshCw className={cn("h-4 w-4", loadingRepos && "animate-spin")} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4 bg-accent/20">
                  <div className="flex items-center gap-3">
                    <Github className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-base font-semibold">{linkedRepos[0].fullName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] text-success border-success/30">Active</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowRepoSelector(true)}>
                    Change Repository
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {linkedRepos.length > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">Change Connected Repository</h3>
                    <p className="text-sm text-muted-foreground">Linking a new repository will replace "{linkedRepos[0].fullName}"</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowRepoSelector(false)}>Cancel</Button>
                </div>
              )}
              
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
                            onClick={async () => {
                              await handleLinkRepo(repo.id);
                              setShowRepoSelector(false);
                            }}
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
            </div>
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
