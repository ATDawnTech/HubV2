import { useEffect, useRef, useState } from "react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateEmployee } from "../hooks/useUpdateEmployee";
import { useEmployeeRoles } from "../hooks/useEmployeeRoles";
import { useAddEmployeeRole } from "../hooks/useAddEmployeeRole";
import { useRemoveEmployeeRole } from "../hooks/useRemoveEmployeeRole";
import { useUpdateAssignment } from "@/features/admin-settings/hooks/useUpdateAssignment";
import { useRoles } from "@/features/admin-settings/hooks/useRoles";
import { usePermissions } from "@/hooks/usePermissions";
import type { UpdateEmployeeFormValues } from "../schemas/employee.schemas";
import type { Employee, EmployeeRoleEntry } from "../types/employee.types";
import { EmployeeForm } from "./EmployeeForm";

interface Asset {
  id: string;
  name: string;
  type: string;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function AssetCount({ assets }: { assets: Asset[] }) {
  const count = assets.length;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
        count > 0
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      <span className="font-semibold">{count}</span>
      {count === 1 ? "Asset" : "Assets"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// RoleRow — interactive role display with remove + manager toggle (hierarchy-gated)
// ---------------------------------------------------------------------------

function RoleRow({
  entry,
  employeeId,
  canManageEntry,
  canSetManager,
}: {
  entry: EmployeeRoleEntry;
  employeeId: string;
  canManageEntry: boolean;
  canSetManager: boolean;
}) {
  const removeRole = useRemoveEmployeeRole(employeeId);
  const updateAssignment = useUpdateAssignment(entry.role_id, employeeId);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="text-sm font-medium text-card-foreground">{entry.role_name}</span>
      {entry.is_manager && (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/15 border border-yellow-400/30 px-2 py-0.5 text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">
          <span>★</span> Manager
        </span>
      )}
      {canManageEntry && (
        <div className="ml-auto flex items-center gap-1.5">
          {canSetManager && (
            <button
              type="button"
              onClick={() =>
                updateAssignment.mutate({
                  is_manager: !entry.is_manager,
                  manager_permissions: [],
                })
              }
              disabled={updateAssignment.isPending}
              className="rounded border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-yellow-400/50 hover:text-yellow-600 disabled:opacity-50"
            >
              {entry.is_manager ? "★ Manager" : "☆ Set Manager"}
            </button>
          )}
          <button
            type="button"
            onClick={() => removeRole.mutate({ roleId: entry.role_id })}
            disabled={removeRole.isPending}
            className="rounded border border-destructive/30 px-2 py-0.5 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoleLabel — read-only display of a role assignment (name + manager badge)
// ---------------------------------------------------------------------------

function RoleLabel({ entry }: { entry: EmployeeRoleEntry }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="text-sm font-medium text-card-foreground">{entry.role_name}</span>
      {entry.is_manager && (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/15 border border-yellow-400/30 px-2 py-0.5 text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">
          <span>★</span> Manager
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RolePicker — dropdown to add a new role
// ---------------------------------------------------------------------------

function RolePicker({
  employeeId,
  assignedRoleIds,
  onClose,
}: {
  employeeId: string;
  assignedRoleIds: string[];
  onClose: () => void;
}) {
  const { employeeId: currentUserId } = useAuth();
  const { data: rolesPage } = useRoles();
  const { data: currentUserRoles = [] } = useEmployeeRoles(currentUserId ?? "");
  const addRole = useAddEmployeeRole(employeeId);

  const allRoles = rolesPage?.roles ?? [];

  // Determine the current user's minimum sort_order so we only show roles below them.
  // Manager status elevates the user one position above their base role.
  const currentUserRoleIds = new Set(currentUserRoles.map((r) => r.role_id));
  const currentUserSortOrders = allRoles
    .filter((r) => currentUserRoleIds.has(r.id))
    .map((r) => {
      const sortOrder = r.sort_order ?? 9999;
      const entry = currentUserRoles.find((ur) => ur.role_id === r.id);
      return entry?.is_manager ? sortOrder - 1 : sortOrder;
    });
  const minCurrentSortOrder = currentUserSortOrders.length > 0
    ? Math.min(...currentUserSortOrders)
    : -1; // -1 = unauthenticated / no roles → show nothing below check

  // Only system admins can assign system roles
  const currentUserHasSystemRole = allRoles.some((r) => r.is_system && currentUserRoleIds.has(r.id));

  const available = allRoles
    .filter((r) => !assignedRoleIds.includes(r.id))
    .filter((r) => !r.is_system || currentUserHasSystemRole)
    .filter((r) => minCurrentSortOrder < 0 || (r.sort_order ?? 9999) > minCurrentSortOrder)
    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

  return (
    <div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
      {available.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          {allRoles.filter((r) => !assignedRoleIds.includes(r.id)).length === 0
            ? "All roles already assigned."
            : "No roles available to assign at your level."}
        </p>
      ) : (
        available.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => { addRole.mutate(role.id); onClose(); }}
            disabled={addRole.isPending}
            className="block w-full px-4 py-2 text-left text-sm text-card-foreground hover:bg-muted disabled:opacity-50"
          >
            {role.name}
            {role.description && (
              <span className="ml-2 text-xs text-muted-foreground">{role.description}</span>
            )}
          </button>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmployeeEditModal
// ---------------------------------------------------------------------------

interface Props {
  employee: Employee;
  onClose: () => void;
  onDismiss: () => void;
}

export function EmployeeEditModal({ employee, onClose, onDismiss }: Props) {
  const updateEmployee = useUpdateEmployee(employee.id);
  const { data: roles = [] } = useEmployeeRoles(employee.id);
  const validRoles = roles.filter((e) => !!e.role_id);
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("admin", "manage_roles");
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Hierarchy: compute which assigned roles the current user can manage
  const { employeeId: currentUserId } = useAuth();
  const { data: currentUserRoles = [] } = useEmployeeRoles(currentUserId ?? "");
  const { data: rolesPage } = useRoles();
  const allRoles = rolesPage?.roles ?? [];
  const currentUserRoleIds = new Set(currentUserRoles.map((r) => r.role_id));
  const currentUserHasSystemRole = allRoles.some((r) => r.is_system && currentUserRoleIds.has(r.id));
  const currentUserSortOrders = allRoles
    .filter((r) => currentUserRoleIds.has(r.id))
    .map((r) => {
      const sortOrder = r.sort_order ?? 9999;
      const entry = currentUserRoles.find((ur) => ur.role_id === r.id);
      return entry?.is_manager ? sortOrder - 1 : sortOrder;
    });
  const minCurrentSortOrder = currentUserSortOrders.length > 0
    ? Math.min(...currentUserSortOrders)
    : 9999;

  function canManageRole(roleId: string): boolean {
    if (!canManage) return false;
    const role = allRoles.find((r) => r.id === roleId);
    if (!role) return false;
    if (role.is_system) return currentUserHasSystemRole;
    return (role.sort_order ?? 9999) > minCurrentSortOrder;
  }

  // Only system admins can assign manager status for a role.
  // System roles cannot have managers. A manager of a role cannot create additional managers.
  function canSetManagerForRole(roleId: string): boolean {
    const role = allRoles.find((r) => r.id === roleId);
    if (role?.is_system) return false; // system roles never have managers
    if (currentUserHasSystemRole) return true;
    return false; // only system admins can set manager
  }

  const assets: Asset[] = [];
  const assignedProjects: string[] = [];

  useEffect(() => {
    if (!rolePickerOpen) return;
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setRolePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [rolePickerOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(data: UpdateEmployeeFormValues): void {
    const payload = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === "" ? null : v]),
    ) as UpdateEmployeeFormValues;
    updateEmployee.mutate(payload, {
      onSuccess: () => { onClose(); },
    });
  }

  const empName = `${employee.first_name} ${employee.last_name}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-employee-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onDismiss}
    >
      <div
        className="flex w-full max-w-3xl flex-col rounded-xl bg-card shadow-xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between rounded-t-xl bg-orange-500 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              {employee.employee_code && (
                <span className="font-mono text-xs font-semibold text-orange-100">{employee.employee_code}</span>
              )}
            </div>
            <h2 id="edit-employee-title" className="mt-1 text-lg font-semibold text-white">
              {empName}
            </h2>
            <p className="text-sm text-orange-100">{employee.work_email}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-orange-200 hover:text-white">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

          <section>
            <SectionHeading>Edit Details</SectionHeading>
            <EmployeeForm
              mode="edit"
              onSubmit={handleSubmit}
              isSubmitting={updateEmployee.isPending}
              defaultValues={employee}
            />
            {updateEmployee.isError && (
              <div className="mt-4">
                <ErrorMessage message="Failed to save changes. Please try again." />
              </div>
            )}
          </section>

          <section className="border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <SectionHeading>Roles</SectionHeading>
              {canManage && (
              <div ref={pickerRef} className="relative mb-3">
                <button
                  type="button"
                  onClick={() => setRolePickerOpen((v) => !v)}
                  title="Add role"
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <span className="text-base leading-none">+</span>
                  Add Role
                </button>
                {rolePickerOpen && (
                  <div className="absolute right-0 top-full z-10 w-64">
                    <RolePicker
                      employeeId={employee.id}
                      assignedRoleIds={validRoles.map((e) => e.role_id)}
                      onClose={() => setRolePickerOpen(false)}
                    />
                  </div>
                )}
              </div>
            )}
            </div>
            {validRoles.length > 0 ? (
              <div className="space-y-2">
                {validRoles.map((entry) => {
                  const manageable = canManageRole(entry.role_id);
                  // Non-system-admins cannot remove or modify manager assignments
                  const targetIsManager = entry.is_manager && !currentUserHasSystemRole;
                  return manageable && !targetIsManager ? (
                    <RoleRow key={entry.role_id} entry={entry} employeeId={employee.id} canManageEntry canSetManager={canSetManagerForRole(entry.role_id)} />
                  ) : (
                    <RoleLabel key={entry.role_id} entry={entry} />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No roles assigned.</p>
            )}
          </section>

          <section className="border-t border-border pt-5">
            <SectionHeading>Assets</SectionHeading>
            <AssetCount assets={assets} />
            {assets.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Asset management available when the Asset module is connected.
              </p>
            )}
          </section>

          <section className="border-t border-border pt-5">
            <SectionHeading>Assigned Projects</SectionHeading>
            {assignedProjects.length > 0 ? (
              <ul className="space-y-1">
                {assignedProjects.map((p) => (
                  <li key={p} className="text-sm text-card-foreground">{p}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No projects assigned. Available when Epic 7 is connected.
              </p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
