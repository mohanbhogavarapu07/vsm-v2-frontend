import { useProjectStore, AccessLevel } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';

export function usePermissions() {
  const { members, roles, currentProject } = useProjectStore();
  const { user } = useAuthStore();

  const currentMember = members.find((m) => m.user_id === user?.id);
  const currentRole = roles.find((r) => r.id === currentMember?.role_id);
  const accessLevel: AccessLevel | null = currentRole?.access_level || null;
  const isProjectOwner = currentProject?.owner_id === user?.id;

  const isHighAccess = accessLevel === 'HIGH' || isProjectOwner;
  const isMediumAccess = accessLevel === 'MEDIUM' || isHighAccess;
  const isLowAccess = accessLevel === 'LOW' || isMediumAccess;

  return {
    currentMember,
    currentRole,
    accessLevel,
    isProjectOwner,
    // HIGH = full admin
    canManageTeam: isHighAccess,
    canManageRoles: isHighAccess,
    canManageWorkflows: isHighAccess,
    canManageAI: isHighAccess,
    canApproveAI: isHighAccess,
    canDelete: isHighAccess,
    canViewAnalytics: isHighAccess,
    // MEDIUM = contributor
    canEdit: isMediumAccess,
    canCreate: isMediumAccess,
    canAssignTasks: isMediumAccess,
    // LOW = viewer
    canRead: isLowAccess,
  };
}
