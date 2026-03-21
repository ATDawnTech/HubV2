/**
 * EntraGroupMappingPanel — manage Entra security group → app role mappings.
 *
 * Each mapping causes the SSO login flow to auto-assign (or remove) the
 * linked role based on the user's current Entra group membership.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roleService } from "@/services/role.service";
import { useRoles } from "../hooks/useRoles";
import type { EntraGroupMapping } from "../types/role.types";

export function EntraGroupMappingPanel() {
  const queryClient = useQueryClient();
  const { data: rolesData } = useRoles();
  const roles = rolesData?.roles ?? [];

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ["entra-group-mappings"],
    queryFn: () => roleService.listEntraGroupMappings(),
    staleTime: 30_000,
  });

  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: roleService.createEntraGroupMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entra-group-mappings"] });
      setGroupId("");
      setGroupName("");
      setRoleId("");
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? "Failed to create mapping.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: roleService.deleteEntraGroupMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entra-group-mappings"] });
    },
  });

  function handleAdd() {
    if (!groupId.trim() || !groupName.trim() || !roleId) {
      setError("All fields are required.");
      return;
    }
    setError(null);
    createMutation.mutate({ entra_group_id: groupId.trim(), entra_group_name: groupName.trim(), role_id: roleId });
  }

  function getRoleName(rId: string) {
    return roles.find((r) => r.id === rId)?.name ?? rId;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Entra Group → Role Mappings
      </h3>
      <p className="mb-5 text-sm text-muted-foreground">
        Map Microsoft Entra security groups to app roles. On every SSO login, roles are automatically
        assigned or removed based on the user's current group membership.
      </p>

      {/* Add new mapping form */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input
          type="text"
          placeholder="Group object ID (from Azure)"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="Group display name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select role…</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={createMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {createMutation.isPending ? "Adding…" : "Add"}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Existing mappings */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : mappings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mappings configured. Add one above to enable automatic role assignment.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {mappings.map((m: EntraGroupMapping) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p
                  className="text-sm font-medium text-card-foreground cursor-default"
                  title={m.entra_group_id}
                >
                  {m.entra_group_name}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-3 shrink-0">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {getRoleName(m.role_id)}
                </span>
                <button
                  onClick={() => deleteMutation.mutate(m.id)}
                  disabled={deleteMutation.isPending}
                  className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
