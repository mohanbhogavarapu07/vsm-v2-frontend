import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore, PREDEFINED_PERMISSIONS, Role } from '@/stores/projectStore';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Pencil,
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
  const [creatingRole, setCreatingRole] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);

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
        permissions: ['read'],
      });
      setNewRoleName('');
      setNewRoleDesc('');
      setShowAddRole(false);
    } catch {} finally {
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

  const canManage = canManageTeam || isProjectOwner;
  const canEditRoles = canManageRoles || isProjectOwner;

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage roles, permissions, and team members
        </p>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" /> Members
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" /> Roles & Permissions
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {/* Invite form */}
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

          {/* Members list */}
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
                  <div className="grid grid-cols-2 gap-3">
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

          {/* Permission Matrix */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Permission Matrix
              </CardTitle>
              <CardDescription>
                Configure what each role can do across the project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roles.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">Create roles to configure permissions</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 pr-4 text-left font-medium text-muted-foreground min-w-[180px]">Permission</th>
                        {roles.map((role) => (
                          <th key={role.id} className="px-3 py-3 text-center min-w-[100px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold text-foreground">{role.name}</span>
                              {canEditRoles && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-destructive/60 hover:text-destructive"
                                  onClick={() => setDeleteRoleId(role.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PREDEFINED_PERMISSIONS.map((perm) => (
                        <tr key={perm.key} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-foreground">{perm.label}</p>
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          </td>
                          {roles.map((role) => (
                            <td key={role.id} className="px-3 py-3 text-center">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={role.permissions?.includes(perm.key)}
                                  onCheckedChange={() => handleTogglePermission(role, perm.key)}
                                  disabled={!canEditRoles}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Role Confirm */}
      <AlertDialog open={!!deleteRoleId} onOpenChange={() => setDeleteRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the role and unassign it from all members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteRoleId && projectId) deleteRole(projectId, deleteRoleId);
                setDeleteRoleId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirm */}
      <AlertDialog open={!!removeMemberId} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member from the project. They will lose all access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (removeMemberId && projectId) removeMember(projectId, removeMemberId);
                setRemoveMemberId(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
