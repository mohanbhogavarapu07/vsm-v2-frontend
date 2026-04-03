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
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
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

export default function TeamPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    roles,
    members,
    loading,
    fetchRoles,
    fetchMembers,
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

  useEffect(() => {
    if (projectId) {
      fetchRoles(projectId);
      fetchMembers(projectId);
    }
  }, [projectId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteRoleId || !projectId) return;
    setInviting(true);
    try {
      await inviteMember(projectId, inviteEmail.trim(), inviteRoleId);
      setInviteEmail('');
      setInviteRoleId('');
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
