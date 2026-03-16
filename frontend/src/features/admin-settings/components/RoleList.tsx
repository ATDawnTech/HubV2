import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "../hooks/useRoles";
import { useRole } from "../hooks/useRole";
import { useDeleteRole } from "../hooks/useDeleteRole";
import { useSortRoles } from "../hooks/useSortRoles";
import { useDropdownsByModule } from "../hooks/useDropdownsByModule";
import { usePermissions } from "@/hooks/usePermissions";
import { useEmployeeRoles } from "@/features/employees/hooks/useEmployeeRoles";
import { RoleEditor } from "./RoleEditor";
import { RoleActionMenu } from "./RoleActionMenu";
import { RoleDeptCell } from "./RoleDeptCell";
import type { DropdownOption } from "../types/admin-settings.types";
import type { Role } from "../types/role.types";

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; roleId: string };

function EditPanel({ roleId, currentUserRoleIds, currentUserManagerRoleIds, isSystemAdmin, onClose }: {
  roleId: string;
  currentUserRoleIds: Set<string>;
  currentUserManagerRoleIds: Set<string>;
  isSystemAdmin: boolean;
  onClose: () => void;
}): JSX.Element {
  const { data: role, isPending, isFetching } = useRole(roleId);

  if (isPending || isFetching || !role) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const isOwnRole = currentUserRoleIds.has(roleId);
  const isManagerOfRole = currentUserManagerRoleIds.has(roleId);

  return (
    <RoleEditor
      key={role.updated_at ?? role.id}
      role={role}
      onClose={onClose}
      lockBasePermissions={isManagerOfRole}
      lockAllPermissions={isOwnRole && !isManagerOfRole}
      isSystemAdmin={isSystemAdmin}
    />
  );
}

export function RoleList(): JSX.Element {
  const { data, isLoading, isError } = useRoles();
  const deleteRole = useDeleteRole();
  const sortRoles = useSortRoles();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("admin", "manage_roles");
  const { employeeId } = useAuth();
  const { data: myRoleEntries = [] } = useEmployeeRoles(employeeId ?? "");
  const currentUserRoleIds = new Set(myRoleEntries.map((r) => r.role_id));
  const currentUserManagerRoleIds = new Set(myRoleEntries.filter((r) => r.is_manager).map((r) => r.role_id));
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const allRoles: Role[] = data?.roles ?? [];
  const isSystemAdmin = allRoles.some((r) => r.is_system && currentUserRoleIds.has(r.id));
  const { data: deptsData } = useDropdownsByModule("employees", "department");
  const allDepts: DropdownOption[] = deptsData?.options ?? [];

  const systemRoles = allRoles.filter((r) => r.is_system);
  const nonSystemRoles = allRoles.filter((r) => !r.is_system);

  // Local order for optimistic drag-to-reorder (non-system only)
  const [orderedRoles, setOrderedRoles] = useState<Role[]>([]);
  useEffect(() => {
    setOrderedRoles(
      [...nonSystemRoles].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRoles]);

  // dragIndex  — which orderedRoles index is being dragged
  // dropPosition — insert-before position (0..orderedRoles.length)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<number | null>(null);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent<HTMLTableRowElement>, index: number) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    // Top half → insert before this row; bottom half → insert after
    const pos = e.clientY < rect.top + rect.height / 2 ? index : index + 1;
    setDropPosition(pos);
  }

  function handleDrop() {
    if (dragIndex === null || dropPosition === null) {
      setDragIndex(null);
      setDropPosition(null);
      return;
    }
    // After splicing out the dragged element, target index shifts if it was before the drag source
    const insertAt = dropPosition > dragIndex ? dropPosition - 1 : dropPosition;
    if (insertAt === dragIndex) {
      setDragIndex(null);
      setDropPosition(null);
      return;
    }
    const next = [...orderedRoles];
    const [moved] = next.splice(dragIndex, 1);
    if (!moved) return;
    next.splice(insertAt, 0, moved);
    setOrderedRoles(next);

    const orders = [
      ...systemRoles.map((r) => ({ role_id: r.id, sort_order: 0 })),
      ...next.map((r, i) => ({ role_id: r.id, sort_order: i + 1 })),
    ];
    sortRoles.mutate(orders);
    setDragIndex(null);
    setDropPosition(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropPosition(null);
  }

  const isDragging = dragIndex !== null;
  const isOpen = editor.mode !== "closed";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading roles…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Failed to load roles.
      </div>
    );
  }

  const totalCount = systemRoles.length + orderedRoles.length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} role{totalCount !== 1 ? "s" : ""}
          {canManage && totalCount > 1 && (
            <span className="ml-1.5 text-xs text-muted-foreground/60">· drag to reorder</span>
          )}
        </p>
        {canManage && (
          <button
            onClick={() => setEditor({ mode: "create" })}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Create Role
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full table-fixed text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="w-8 px-2 py-2.5" aria-label="Drag handle" />
              <th className="w-40 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Departments</th>
              <th className="w-24 px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* System roles — always pinned, not draggable */}
            {systemRoles.map((role) => (
              <tr
                key={role.id}
                className={cn(
                  "border-b border-border transition-colors",
                  editor.mode === "edit" && editor.roleId === role.id && "bg-primary/5",
                )}
              >
                <td className="px-2 py-3 text-center">
                  <span title="System role — always at top" className="text-xs text-muted-foreground/30">⊤</span>
                </td>
                <td className="truncate px-4 py-3 font-medium text-foreground">
                  {role.name}
                  <span className="ml-1.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-500">
                    system
                  </span>
                </td>
                <td className="truncate px-4 py-3 text-muted-foreground">
                  {role.description ?? <span className="italic text-muted-foreground/50">—</span>}
                </td>
                <td className="px-4 py-3">
                  <RoleDeptCell role={role} allDepts={allDepts} />
                </td>
                <td className="px-4 py-3 text-right">
                  <RoleActionMenu
                    role={role}
                    onEdit={() => setEditor({ mode: "edit", roleId: role.id })}
                    onDelete={() => deleteRole.mutate(role.id)}
                    isDeleting={deleteRole.isPending}
                    canManage={canManage}
                  />
                </td>
              </tr>
            ))}

            {/* Draggable roles with insert-position drop lines */}
            {orderedRoles.flatMap((role, i) => {
              const isBeingDragged = i === dragIndex;
              const rows: JSX.Element[] = [];

              // Drop-line separator before this row
              rows.push(
                <tr key={`sep-${i}`} aria-hidden className="pointer-events-none">
                  <td colSpan={5} className="p-0 leading-[0]">
                    <div
                      className={cn(
                        "w-full transition-all duration-100",
                        isDragging && dropPosition === i ? "h-0.5 bg-orange-500" : "h-0",
                      )}
                    />
                  </td>
                </tr>,
              );

              rows.push(
                <tr
                  key={role.id}
                  draggable={canManage}
                  onDragStart={canManage ? () => handleDragStart(i) : undefined}
                  onDragOver={canManage ? (e) => handleDragOver(e, i) : undefined}
                  onDrop={canManage ? handleDrop : undefined}
                  onDragEnd={canManage ? handleDragEnd : undefined}
                  className={cn(
                    "border-b border-border transition-colors hover:bg-muted/30",
                    isBeingDragged && "opacity-40",
                    editor.mode === "edit" && editor.roleId === role.id && "bg-primary/5",
                  )}
                >
                  <td className="px-2 py-3 text-center">
                    {canManage && (
                      <span
                        title="Drag to reorder"
                        className="cursor-grab select-none text-base leading-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
                      >
                        ⠿
                      </span>
                    )}
                  </td>
                  <td className="truncate px-4 py-3 font-medium text-foreground">{role.name}</td>
                  <td className="truncate px-4 py-3 text-muted-foreground">
                    {role.description ?? <span className="italic text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RoleDeptCell role={role} allDepts={allDepts} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RoleActionMenu
                      role={role}
                      onEdit={() => setEditor({ mode: "edit", roleId: role.id })}
                      onDelete={() => deleteRole.mutate(role.id)}
                      isDeleting={deleteRole.isPending}
                      canManage={canManage}
                    />
                  </td>
                </tr>,
              );

              return rows;
            })}

            {/* Trailing drop-line (after last draggable row) */}
            <tr aria-hidden className="pointer-events-none">
              <td colSpan={5} className="p-0 leading-[0]">
                <div
                  className={cn(
                    "w-full transition-all duration-100",
                    isDragging && dropPosition === orderedRoles.length ? "h-0.5 bg-orange-500" : "h-0",
                  )}
                />
              </td>
            </tr>

            {totalCount === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No roles yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createPortal(
        <>
          <div
            className={cn(
              "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
              isOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={() => setEditor({ mode: "closed" })}
          />
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl transition-transform duration-300 ease-out",
              isOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {editor.mode === "create" ? (
                <RoleEditor onClose={() => setEditor({ mode: "closed" })} isSystemAdmin={isSystemAdmin} />
              ) : editor.mode === "edit" ? (
                <EditPanel
                  roleId={editor.roleId}
                  currentUserRoleIds={currentUserRoleIds}
                  currentUserManagerRoleIds={currentUserManagerRoleIds}
                  isSystemAdmin={isSystemAdmin}
                  onClose={() => setEditor({ mode: "closed" })}
                />
              ) : null}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
