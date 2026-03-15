import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { useRoles } from "@/features/admin-settings/hooks/useRoles";
import { roleService } from "@/services/role.service";
import { roleKeys } from "@/features/admin-settings/hooks/roleKeys";
import { RoleTesterDropdown } from "./RoleTesterDropdown";

export function RoleTesterMenu(): JSX.Element | null {
  const isImpersonating = !!localStorage.getItem("adthub_original_token");
  if (!isImpersonating) return null;
  return <RoleTesterMenuInner />;
}

function RoleTesterMenuInner(): JSX.Element {
  const { employeeId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string> | null>(null);
  const [managerIds, setManagerIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const { data: rolesData } = useRoles();
  const roles = rolesData?.roles ?? [];

  const { data: myAssignments = [] } = useQuery({
    queryKey: [...roleKeys.all, "my-assignments", employeeId],
    queryFn: async () => {
      const assigned: string[] = [];
      for (const role of roles) {
        try {
          const assignments = await roleService.getRoleAssignments(role.id);
          if (assignments.some((a) => a.employee_id === employeeId)) {
            assigned.push(role.id);
          }
        } catch { /* skip */ }
      }
      return assigned;
    },
    enabled: !!employeeId && roles.length > 0,
    staleTime: 5_000,
  });

  const assignedSet = new Set(myAssignments);

  useEffect(() => {
    setPendingIds(new Set(assignedSet));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAssignments]);

  const selection = pendingIds ?? assignedSet;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggleRole(id: string) {
    setPendingIds((prev) => {
      const next = new Set(prev ?? assignedSet);
      if (next.has(id)) {
        next.delete(id);
        setManagerIds((m) => { const nm = new Set(m); nm.delete(id); return nm; });
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleManager(id: string) {
    setManagerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["permissions", "effective"] });
    queryClient.invalidateQueries({ queryKey: [...roleKeys.all, "my-assignments", employeeId] });
  }

  async function applyRoles() {
    if (!employeeId) return;
    setIsApplying(true);
    try {
      await roleService.unassignAllMyRoles();
      for (const roleId of selection) {
        try {
          await roleService.assignRole(roleId, {
            employee_id: employeeId,
            is_manager: managerIds.has(roleId),
          });
        } catch { /* skip */ }
      }
      invalidate();
      toast.success(`${selection.size} role(s) applied.`);
      setOpen(false);
      navigate("/dashboard");
    } catch {
      toast.error("Failed to apply roles.");
    } finally {
      setIsApplying(false);
    }
  }

  async function stopTesting() {
    setIsStopping(true);
    try {
      await roleService.unassignAllMyRoles();
    } catch { /* best-effort */ }

    const savedToken = localStorage.getItem("adthub_original_token");
    const savedEmpId = localStorage.getItem("adthub_original_employee_id");
    if (savedToken) localStorage.setItem("adthub_token", savedToken);
    if (savedEmpId) localStorage.setItem("adthub_employee_id", savedEmpId);
    localStorage.removeItem("adthub_original_token");
    localStorage.removeItem("adthub_original_employee_id");

    queryClient.clear();
    window.location.reload();
  }

  const isDirty =
    pendingIds !== null &&
    (pendingIds.size !== assignedSet.size ||
      [...pendingIds].some((id) => !assignedSet.has(id)) ||
      managerIds.size > 0);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors",
          open
            ? "border-amber-500/60 bg-amber-500/20 text-amber-700 dark:text-amber-300"
            : "border-amber-400/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
        )}
        aria-label="Role tester"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
        </svg>
        TEST MODE
        {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      </button>

      {open && (
        <RoleTesterDropdown
          roles={roles}
          selection={selection}
          managerIds={managerIds}
          isDirty={isDirty}
          isApplying={isApplying}
          isStopping={isStopping}
          employeeId={employeeId}
          onToggleRole={toggleRole}
          onToggleManager={toggleManager}
          onApplyRoles={applyRoles}
          onStopTesting={stopTesting}
        />
      )}
    </div>
  );
}
