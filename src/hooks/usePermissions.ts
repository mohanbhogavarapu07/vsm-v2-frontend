import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';

export function usePermissions() {
  const { members, roles, currentProject } = useProjectStore();
  const { user } = useAuthStore();

  const currentMember = members.find((m) => m.user_id === user?.id);
  const currentRole = roles.find((r) => r.id === currentMember?.role_id);

  const hasPermission = (permission: string): boolean => {
    if (!currentRole) return false;
    if (currentRole.permissions.includes('admin')) return true;
    return currentRole.permissions.includes(permission);
  };

  const isProjectOwner = currentProject?.owner_id === user?.id;

  return {
    currentMember,
    currentRole,
    hasPermission,
    isProjectOwner,
    canRead: hasPermission('read') || isProjectOwner,
    canEdit: hasPermission('edit') || isProjectOwner,
    canCreate: hasPermission('create') || isProjectOwner,
    canDelete: hasPermission('delete') || isProjectOwner,
    canManageTeam: hasPermission('manage_team') || isProjectOwner,
    canAssignTasks: hasPermission('assign_tasks') || isProjectOwner,
    canManageRoles: hasPermission('manage_roles') || isProjectOwner,
    canManageWorkflows: hasPermission('manage_workflows') || isProjectOwner,
    canViewAnalytics: hasPermission('view_analytics') || isProjectOwner,
    canManageAI: hasPermission('manage_ai') || isProjectOwner,
    canApproveAI: hasPermission('approve_ai') || isProjectOwner,
  };
}
