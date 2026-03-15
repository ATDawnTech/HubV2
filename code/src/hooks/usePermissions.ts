import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { roleService } from "@/services/role.service";
import { useRoles } from "@/features/admin-settings/hooks/useRoles";
import { roleKeys } from "@/features/admin-settings/hooks/roleKeys";
import type { Permission } from "@/features/admin-settings/types/role.types";
import { VERB_PERMISSIONS, NOUN_PERMISSIONS } from "@/features/admin-settings/types/role.types";

const ALL_PERMISSIONS: Permission[] = [...VERB_PERMISSIONS, ...NOUN_PERMISSIONS];

export function usePermissions() {
  const { employeeId } = useAuth();
  const isImpersonating = !!localStorage.getItem("adthub_original_token");

  const query = useQuery({
    queryKey: ["permissions", "effective"],
    queryFn: () => roleService.getMyEffectivePermissions(),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });

  // When impersonating, detect if the test user has a system role assigned.
  // System role permissions aren't stored in role_permissions rows — they're
  // implicit — so we synthesize ALL_PERMISSIONS on the frontend when one is held.
  const { data: rolesData } = useRoles();
  const allRoles = rolesData?.roles ?? [];

  const { data: myAssignedIds = [] } = useQuery({
    queryKey: [...roleKeys.all, "my-assignments", employeeId],
    queryFn: async () => {
      const assigned: string[] = [];
      for (const role of allRoles) {
        try {
          const assignments = await roleService.getRoleAssignments(role.id);
          if (assignments.some((a) => a.employee_id === employeeId)) {
            assigned.push(role.id);
          }
        } catch { /* skip */ }
      }
      return assigned;
    },
    enabled: isImpersonating && !!employeeId && allRoles.length > 0,
    staleTime: 5_000,
  });

  const hasSystemRole = isImpersonating &&
    myAssignedIds.some((id) => allRoles.find((r) => r.id === id)?.is_system);

  const permissions: Permission[] = hasSystemRole ? ALL_PERMISSIONS : (query.data ?? []);

  function hasPermission(module: string, action: string): boolean {
    if (!isImpersonating) return true;
    if (hasSystemRole) return true;
    return permissions.some((p) => p.module === module && p.action === action);
  }

  function hasAnyPermissionInModule(module: string): boolean {
    if (!isImpersonating) return true;
    if (hasSystemRole) return true;
    return permissions.some((p) => p.module === module);
  }

  return {
    permissions,
    isLoading: query.isLoading,
    isImpersonating,
    hasPermission,
    hasAnyPermissionInModule,
  };
}
