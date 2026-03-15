import { useState, useEffect } from "react";
import type { Employee, EmployeeRoleEntry } from "../types/employee.types";
import { useEmployeeRoles } from "../hooks/useEmployeeRoles";
import { AssetBadge } from "./AssetBadge";
import type { Asset } from "./AssetBadge";
import { EmployeeExportDropdown } from "./EmployeeExportDropdown";
import { STATUS_LABELS, STATUS_STYLES, HIRE_TYPE_LABELS, WORK_MODE_LABELS, InfoRow, SectionHeading } from "./employeeViewHelpers";

interface Props {
  employee: Employee;
  onClose: () => void;
  onDismiss: () => void;
  onEdit: () => void;
  canExport?: boolean;
  canManageRoles?: boolean;
  staleFields?: Record<string, string>;
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
// EmployeeViewModal
// ---------------------------------------------------------------------------

export function EmployeeViewModal({ employee: emp, onClose, onDismiss, onEdit, canExport = true, canManageRoles = false, staleFields = {} }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const assets: Asset[] = [];
  const assignedProjects: string[] = [];
  const projectHistory: string[] = [];
  const { data: roles = [] } = useEmployeeRoles(emp.id);
  const validRoles = roles.filter((e) => !!e.role_id);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-employee-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onDismiss}
    >
      <div
        className="flex w-full max-w-3xl flex-col rounded-xl bg-card shadow-xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between rounded-t-xl bg-orange-500 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              {emp.employee_code && (
                <span className="font-mono text-xs font-semibold text-orange-100">{emp.employee_code}</span>
              )}
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[emp.status] ?? "bg-gray-100 text-gray-500"}`}>
                {STATUS_LABELS[emp.status] ?? emp.status}
              </span>
            </div>
            <h2 id="view-employee-title" className="mt-1 text-lg font-semibold text-white">
              {emp.first_name} {emp.last_name}
            </h2>
            <p className="text-sm text-orange-100">{emp.work_email}</p>
          </div>
          <div className="flex items-center gap-3">
            {canExport && <EmployeeExportDropdown employee={emp} />}
            <button onClick={onClose} aria-label="Close" className="text-orange-200 hover:text-white">✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section className={Object.keys(staleFields).length > 0 ? "rounded-lg border border-orange-400 bg-orange-500/5 p-3" : ""}>
            <SectionHeading>
              Employee Details
              {Object.keys(staleFields).length > 0 && (
                <span className="ml-2 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
                  Update Required
                </span>
              )}
            </SectionHeading>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow label="Job Title" value={emp.job_title} />
              <InfoRow label="Department" value={emp.department} staleReason={staleFields["department"]} />
              <InfoRow label="Location" value={emp.location} staleReason={staleFields["location"]} />
              <InfoRow label="Hire Type" value={HIRE_TYPE_LABELS[emp.hire_type ?? ""] ?? emp.hire_type} staleReason={staleFields["hire_type"]} />
              <InfoRow label="Work Mode" value={WORK_MODE_LABELS[emp.work_mode ?? ""] ?? emp.work_mode} staleReason={staleFields["work_mode"]} />
              <InfoRow label="Hire Date" value={emp.hire_date} />
            </dl>
          </section>

          <section className="border-t border-border pt-5">
            <SectionHeading>Roles</SectionHeading>
            <div className="mt-3">
              {validRoles.length > 0 ? (
                <div className="space-y-2">
                  {validRoles.map((entry) => (
                    <RoleLabel key={entry.role_id} entry={entry} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No roles assigned.</p>
              )}
            </div>
          </section>

          <section className="border-t border-border pt-5">
            <SectionHeading>Assets</SectionHeading>
            <div className="mt-3">
              <AssetBadge assets={assets} />
              {assets.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Asset tracking available when the Asset module is connected.
                </p>
              )}
            </div>
          </section>

          <section className="border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <SectionHeading>Assigned Projects</SectionHeading>
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                title="Project History"
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <span className="inline-block text-sm transition-transform duration-300" style={{ transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)" }}>↺</span>
                History
              </button>
            </div>
            <div className="mt-3">
              {assignedProjects.length > 0 ? (
                <ul className="space-y-1">
                  {assignedProjects.map((p) => <li key={p} className="text-sm text-card-foreground">{p}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No projects assigned. Available when Epic 7 is connected.</p>
              )}
            </div>
            {historyOpen && (
              <div className="mt-4 rounded-md border border-border bg-muted/30 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project History</p>
                {projectHistory.length > 0 ? (
                  <ul className="space-y-1">
                    {projectHistory.map((p) => <li key={p} className="text-sm text-card-foreground">{p}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No project history. Available when Epic 7 is connected.</p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary">
            Close
          </button>
          <button onClick={onEdit} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
