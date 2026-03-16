import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Employee } from "../types/employee.types";
import { EmployeeEditModal } from "./EmployeeEditModal";
import { EmployeeViewModal } from "./EmployeeViewModal";
import { formatLabel } from "./FormField";
import { exportCsv, exportPdf } from "../lib/employeeExport";

interface Props {
  employee: Employee;
  adminMode: boolean;
  canEdit?: boolean;
  canExport?: boolean;
  canManageRoles?: boolean;
  isArchiving: boolean;
  onArchive: (id: string) => void;
  staleFields?: Record<string, string>;
}

export function EmployeeActionMenu({
  employee, adminMode, canEdit = true, canExport = true, canManageRoles = false, isArchiving, onArchive, staleFields = {},
}: Props) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [active, setActive] = useState<"view" | "edit" | "archive-confirm" | null>(null);
  const [viewMounted, setViewMounted] = useState(false);
  const [editMounted, setEditMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function close() { setOpen(false); }
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function openView() { setViewMounted(true); setActive("view"); }
  function openEdit() { setEditMounted(true); setActive("edit"); }
  function dismissView() { setActive(null); }
  function dismissEdit() { setActive(null); }
  function closeView() { setActive(null); setViewMounted(false); }
  function closeEdit() { setActive(null); setEditMounted(false); }

  const canArchive = adminMode && (employee.status === "active" || employee.status === "new_onboard");

  return (
    <>
      <div className="flex flex-nowrap items-center justify-end gap-2">
        {canEdit && Object.keys(staleFields).length > 0 && (
          <button
            onClick={() => { openEdit(); }}
            className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-500 hover:bg-orange-500/20"
            title={Object.entries(staleFields).map(([f, r]) => `${formatLabel(f)}: ${r}`).join(", ")}
          >
            Update Required
          </button>
        )}
        <button
          ref={triggerRef}
          onClick={() => {
            if (open) { setOpen(false); return; }
            if (triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect();
              const dropUp = rect.bottom + 200 > window.innerHeight;
              setMenuPos({ top: dropUp ? rect.top - 4 : rect.bottom + 4, right: window.innerWidth - rect.right });
            }
            setOpen(true);
          }}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Actions"
        >
          ⋮
        </button>
      </div>

      {open && menuPos && createPortal(
        <div
          style={{
            position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 50,
            transform: menuPos.top < (triggerRef.current?.getBoundingClientRect().bottom ?? 0) ? "translateY(-100%)" : undefined,
          }}
          className="min-w-[160px] rounded-md border border-border bg-card shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button onClick={() => { setOpen(false); openView(); }} className="block w-full px-4 py-2 text-left text-sm text-card-foreground hover:bg-muted">View</button>
          {canEdit && <button onClick={() => { setOpen(false); openEdit(); }} className="block w-full px-4 py-2 text-left text-sm text-card-foreground hover:bg-muted">Edit</button>}
          {adminMode && (
            <>
              <div className="my-1 border-t border-border" />
              {canExport && (
                <>
                  <button onClick={() => { setOpen(false); exportCsv([employee], `${employee.employee_code ?? employee.id}.csv`); }} className="block w-full px-4 py-2 text-left text-sm font-medium text-orange-500 hover:bg-orange-500/10">Export as CSV</button>
                  <button onClick={() => { setOpen(false); exportPdf([employee]); }} className="block w-full px-4 py-2 text-left text-sm font-medium text-orange-500 hover:bg-orange-500/10">Export as PDF</button>
                </>
              )}
              {canArchive && (
                <button onClick={() => { setOpen(false); setActive("archive-confirm"); }} className="block w-full px-4 py-2 text-left text-sm font-medium text-orange-500 hover:bg-orange-500/10">Archive</button>
              )}
            </>
          )}
        </div>,
        document.body,
      )}

      {viewMounted && createPortal(
        <div style={active !== "view" ? { display: "none" } : undefined}>
          <EmployeeViewModal employee={employee} staleFields={staleFields} canExport={canExport} canManageRoles={canManageRoles} onClose={closeView} onDismiss={dismissView} onEdit={() => { closeView(); openEdit(); }} />
        </div>,
        document.body,
      )}
      {editMounted && createPortal(
        <div style={active !== "edit" ? { display: "none" } : undefined}>
          <EmployeeEditModal employee={employee} onClose={closeEdit} onDismiss={dismissEdit} />
        </div>,
        document.body,
      )}

      {active === "archive-confirm" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl whitespace-normal">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-card-foreground">Archive Employee</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to archive{" "}
                <span className="font-medium text-card-foreground">{employee.first_name} {employee.last_name}</span>?
                This will begin the offboarding process.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setActive(null)} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary">Cancel</button>
              <button onClick={() => { setActive(null); onArchive(employee.id); }} disabled={isArchiving}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                {isArchiving ? "Archiving…" : "Yes, Archive"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
