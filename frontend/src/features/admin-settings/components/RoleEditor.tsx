import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useCreateRole } from "../hooks/useCreateRole";
import { useUpdateRole } from "../hooks/useUpdateRole";
import { useSetPermissions } from "../hooks/useSetPermissions";
import { useSetManagerPermissions } from "../hooks/useSetManagerPermissions";
import { PermissionVerbGrid } from "./PermissionVerbGrid";
import { PermissionNounGrid } from "./PermissionNounGrid";
import { AutoAssignDeptPicker } from "./AutoAssignDeptPicker";
import type { Permission, RoleWithPermissions } from "../types/role.types";
import { VERB_PERMISSIONS, NOUN_PERMISSIONS } from "../types/role.types";

interface RoleEditorProps {
  role?: RoleWithPermissions;
  onClose: () => void;
  /** Lock base permission editing (e.g. managers of this role) */
  lockBasePermissions?: boolean;
  /** Lock all permission editing (e.g. user holds this exact role, not as manager) */
  lockAllPermissions?: boolean;
  /** Whether the current user holds a system admin role */
  isSystemAdmin?: boolean;
}

/** Merge two permission arrays, deduplicating by (module, action). */
function mergePerms(a: Permission[], b: Permission[]): Permission[] {
  const seen = new Set(a.map((p) => `${p.module}:${p.action}`));
  const result = [...a];
  for (const p of b) {
    const key = `${p.module}:${p.action}`;
    if (!seen.has(key)) { seen.add(key); result.push(p); }
  }
  return result;
}

export function RoleEditor({ role, onClose, lockBasePermissions = false, lockAllPermissions = false, isSystemAdmin = false }: RoleEditorProps): JSX.Element {
  const isEdit = !!role;
  const isSystem = !!role?.is_system;
  const baseReadonly = isSystem || lockBasePermissions || lockAllPermissions;
  const allPermissions: Permission[] = [...VERB_PERMISSIONS, ...NOUN_PERMISSIONS];

  // Non-system-admins cannot grant manage_roles to other roles
  const lockedPerms: Permission[] = isSystemAdmin
    ? []
    : [{ module: "admin", action: "manage_roles" }];

  const initialBase: Permission[] = isSystem ? allPermissions : (role?.permissions ?? []);
  const initialMgr: Permission[] = role?.manager_permissions?.length
    ? mergePerms(role.manager_permissions, initialBase)  // saved mgr perms + inherit base
    : [...initialBase];                                    // nothing saved yet → start from base

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [autoAssignDepts, setAutoAssignDepts] = useState<string[]>(role?.auto_assign_departments ?? []);
  const [permissions, setPermissions] = useState<Permission[]>(initialBase);
  const [managerPerms, setManagerPerms] = useState<Permission[]>(initialMgr);
  const [managerSectionOpen, setManagerSectionOpen] = useState(false);
  const [basePermsOpen, setBasePermsOpen] = useState(true);

  // Extra permissions granted only to managers (beyond the base role)
  const extraManagerPermsCount = useMemo(
    () => managerPerms.filter(
      (mp) => !permissions.some((p) => p.module === mp.module && p.action === mp.action)
    ).length,
    [managerPerms, permissions],
  );

  /** Update base perms and keep manager perms as a superset. */
  function handleBasePermChange(updated: Permission[]) {
    setPermissions(updated);
    setManagerPerms((prev) => mergePerms(prev, updated));
  }

  const createRole = useCreateRole();
  const updateRole = useUpdateRole(role?.id ?? "");
  const setPerms = useSetPermissions(role?.id ?? "");
  const setMgrPerms = useSetManagerPermissions(role?.id ?? "");

  const isBusy =
    createRole.isPending || updateRole.isPending || setPerms.isPending || setMgrPerms.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEdit) {
      await updateRole.mutateAsync({
        name,
        description: description || undefined,
        auto_assign_departments: autoAssignDepts,
      });
      await setPerms.mutateAsync({ permissions });
      await setMgrPerms.mutateAsync({ permissions: managerPerms });
    } else {
      await createRole.mutateAsync({
        name,
        description: description || undefined,
        auto_assign_departments: autoAssignDepts,
      });
    }
    onClose();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {isEdit ? `Edit Role: ${role.name}` : "Create Role"}
        </h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          ✕
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Role Name <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. HR Manager"
              required
              disabled={role?.is_system}
            />
            {role?.is_system && (
              <p className="mt-1 text-xs text-muted-foreground">System role name cannot be changed.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="Optional description"
              disabled={isSystem}
            />
          </div>

          {isSystem && (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-primary">System Administrator</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This role has all permissions enabled and cannot be modified.
              </p>
            </div>
          )}

          {lockAllPermissions && !isSystem && (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/5 px-4 py-3">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Own Role</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                You cannot modify permissions for a role you currently hold.
              </p>
            </div>
          )}

          {lockBasePermissions && !lockAllPermissions && !isSystem && (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/5 px-4 py-3">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Manager of this Role</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                As a manager of this role you cannot modify its permissions.
              </p>
            </div>
          )}

          {!isSystem && (
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Auto-Assign Departments
              </label>
              <p className="mb-2 text-xs text-muted-foreground">
                Automatically assign this role when an employee is placed in these departments.
              </p>
              <AutoAssignDeptPicker value={autoAssignDepts} onChange={setAutoAssignDepts} />
            </div>
          )}

          {isEdit && (
            <>
              {/* Base permissions — collapsible */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setBasePermsOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Base Permissions
                  </span>
                  <span className="text-xs text-muted-foreground transition-transform duration-200" style={{ display: "inline-block", transform: basePermsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ▾
                  </span>
                </button>

                {basePermsOpen && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Action Permissions
                      </h3>
                      <PermissionVerbGrid
                        selected={permissions.filter((p) => p.module !== "visibility")}
                        onChange={(updated) =>
                          handleBasePermChange([...updated, ...permissions.filter((p) => p.module === "visibility")])
                        }
                        readonly={baseReadonly}
                        lockedPermissions={lockedPerms}
                      />
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Visibility Permissions
                      </h3>
                      <PermissionNounGrid
                        selected={permissions.filter((p) => p.module === "visibility")}
                        onChange={(updated) =>
                          handleBasePermChange([...permissions.filter((p) => p.module !== "visibility"), ...updated])
                        }
                        readonly={baseReadonly}
                        lockedPermissions={lockedPerms}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Manager permissions — collapsible */}
              {!isSystem && !lockAllPermissions && !lockBasePermissions && (
                <div className="rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setManagerSectionOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Manager Permissions
                      </span>
                      {extraManagerPermsCount > 0 ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          +{extraManagerPermsCount} extra
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          inherits base
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground transition-transform duration-200" style={{ display: "inline-block", transform: managerSectionOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      ▾
                    </span>
                  </button>

                  {managerSectionOpen && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Managers inherit all base permissions above. Select additional permissions exclusive to managers here.
                      </p>
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Action Permissions
                        </h4>
                        <p className="mb-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded border border-orange-300/40 bg-orange-500/5 px-1.5 py-0.5 text-orange-400/70">✓ Grayed</span>
                          {" "}= inherited from base, cannot be removed.
                        </p>
                        <PermissionVerbGrid
                          selected={managerPerms.filter((p) => p.module !== "visibility")}
                          inheritedPermissions={permissions.filter((p) => p.module !== "visibility")}
                          onChange={(updated) => {
                            const merged = mergePerms(
                              [...updated, ...managerPerms.filter((p) => p.module === "visibility")],
                              permissions,
                            );
                            setManagerPerms(merged);
                          }}
                          lockedPermissions={lockedPerms}
                        />
                      </div>
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Visibility Permissions
                        </h4>
                        <PermissionNounGrid
                          selected={managerPerms.filter((p) => p.module === "visibility")}
                          inheritedPermissions={permissions.filter((p) => p.module === "visibility")}
                          onChange={(updated) => {
                            const merged = mergePerms(
                              [...managerPerms.filter((p) => p.module !== "visibility"), ...updated],
                              permissions,
                            );
                            setManagerPerms(merged);
                          }}
                          lockedPermissions={lockedPerms}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            {isSystem || lockAllPermissions ? "Close" : "Cancel"}
          </button>
          {!isSystem && !lockAllPermissions && (
            <button
              type="submit"
              disabled={isBusy || !name.trim()}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
                isBusy || !name.trim()
                  ? "cursor-not-allowed bg-primary/50"
                  : "bg-primary hover:bg-primary/90",
              )}
            >
              {isBusy ? "Saving…" : isEdit ? "Save Changes" : "Create Role"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
