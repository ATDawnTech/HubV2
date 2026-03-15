import { useEffect, useState } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { useRoles } from "./useRoles";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";
import type { Permission, RoleWithPermissions } from "../types/role.types";
import { VERB_PERMISSIONS, NOUN_PERMISSIONS } from "../types/role.types";
import { useImpersonation } from "./useImpersonation";

const ALL_PERMISSIONS = [...VERB_PERMISSIONS, ...NOUN_PERMISSIONS];

function mergePermissions(roleDetails: (RoleWithPermissions | undefined)[]): Permission[] {
  // System roles have all permissions implicitly — they're not stored in role_permissions rows
  if (roleDetails.some((r) => r?.is_system)) return ALL_PERMISSIONS;
  const seen = new Set<string>();
  const merged: Permission[] = [];
  for (const role of roleDetails) {
    if (!role) continue;
    for (const p of role.permissions) {
      const key = `${p.module}:${p.action}`;
      if (!seen.has(key)) { seen.add(key); merged.push(p); }
    }
  }
  return merged;
}

export function useRoleTester() {
  const { employeeId } = useAuth();
  const queryClient = useQueryClient();
  const { data: rolesData } = useRoles();
  const roles = rolesData?.roles ?? [];
  const impersonation = useImpersonation();

  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [managerRoleIds, setManagerRoleIds] = useState<Set<string>>(new Set());
  const [isSwitching, setIsSwitching] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const roleDetailQueries = useQueries({
    queries: [...selectedRoleIds].map((id) => ({
      queryKey: roleKeys.detail(id),
      queryFn: () => roleService.getRole(id),
      enabled: true,
      staleTime: 10_000,
    })),
  });

  const selectedRoleDetails = roleDetailQueries.map((q) => q.data).filter((d): d is RoleWithPermissions => !!d);
  const hasSelectedSystemRole = roles.some((r) => r.is_system && selectedRoleIds.has(r.id));
  const previewPermissions = hasSelectedSystemRole ? ALL_PERMISSIONS : mergePermissions(selectedRoleDetails);
  const isLoadingDetails = !hasSelectedSystemRole && roleDetailQueries.some((q) => q.isLoading);

  const { data: effectivePerms = [] } = useQuery({
    queryKey: [...roleKeys.all, "effective", employeeId],
    queryFn: () => roleService.getMyEffectivePermissions(),
    enabled: !!employeeId,
    staleTime: 5_000,
  });

  const { data: myAssignments = [] } = useQuery({
    queryKey: [...roleKeys.all, "my-assignments", employeeId],
    queryFn: async () => {
      const assigned: string[] = [];
      for (const role of roles) {
        try {
          const assignments = await roleService.getRoleAssignments(role.id);
          if (assignments.some((a) => a.employee_id === employeeId)) assigned.push(role.id);
        } catch { /* skip */ }
      }
      return assigned;
    },
    enabled: !!employeeId && roles.length > 0,
    staleTime: 5_000,
  });

  const assignedRoleIds = new Set(myAssignments);
  const hasAssignedSystemRole = roles.some((r) => r.is_system && assignedRoleIds.has(r.id));
  const effectivePermsDisplay = hasAssignedSystemRole ? ALL_PERMISSIONS : effectivePerms;

  useEffect(() => {
    if (!impersonation.isImpersonating) { setSelectedRoleIds(new Set()); return; }
    if (assignedRoleIds.size > 0) setSelectedRoleIds(new Set(assignedRoleIds));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAssignments, impersonation.isImpersonating]);

  function toggleRole(roleId: string) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
        setManagerRoleIds((m) => { const nm = new Set(m); nm.delete(roleId); return nm; });
      } else {
        next.add(roleId);
      }
      return next;
    });
  }

  function toggleManagerRole(roleId: string) {
    setManagerRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId); else next.add(roleId);
      return next;
    });
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: [...roleKeys.all, "effective", employeeId] });
    queryClient.invalidateQueries({ queryKey: [...roleKeys.all, "my-assignments", employeeId] });
    queryClient.invalidateQueries({ queryKey: ["permissions", "effective"] });
    for (const role of roles) queryClient.invalidateQueries({ queryKey: roleKeys.assignments(role.id) });
  }

  async function handleApplySelected() {
    if (!employeeId || selectedRoleIds.size === 0) return;
    setIsApplying(true);
    try {
      await roleService.unassignAllMyRoles();
      const errors: string[] = [];
      for (const roleId of selectedRoleIds) {
        try {
          await roleService.assignRole(roleId, { employee_id: employeeId, is_manager: managerRoleIds.has(roleId) });
        } catch {
          const roleName = roles.find((r) => r.id === roleId)?.name ?? roleId;
          errors.push(roleName);
        }
      }
      invalidateAll();
      if (errors.length > 0) toast.error(`Failed to assign: ${errors.join(", ")}`);
      else toast.success(`${selectedRoleIds.size} role(s) assigned.`);
    } catch {
      toast.error("Failed to apply roles.");
    } finally {
      setIsApplying(false);
    }
  }

  async function handleResetAll() {
    if (!employeeId) return;
    setIsResetting(true);
    try {
      await roleService.unassignAllMyRoles();
      invalidateAll();
      setSelectedRoleIds(new Set());
      toast.success("All roles removed.");
    } catch {
      toast.error("Failed to reset roles.");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleStartTestUser() {
    setIsSwitching(true);
    try {
      await impersonation.startImpersonation();
    } catch {
      setIsSwitching(false);
    }
  }

  const isBusy = isApplying || isResetting;
  const hasSelection = selectedRoleIds.size > 0;
  const canApply = impersonation.isImpersonating && hasSelection && !isBusy && !isLoadingDetails;

  return {
    employeeId,
    roles,
    impersonation,
    selectedRoleIds,
    assignedRoleIds,
    effectivePerms: effectivePermsDisplay,
    previewPermissions,
    isSwitching,
    isApplying,
    isResetting,
    isBusy,
    hasSelection,
    canApply,
    ALL_PERMISSIONS,
    managerRoleIds,
    toggleRole,
    toggleManagerRole,
    handleApplySelected,
    handleResetAll,
    handleStartTestUser,
  };
}
