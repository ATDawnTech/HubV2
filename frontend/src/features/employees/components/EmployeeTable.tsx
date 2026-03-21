/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from "react";
import type { Employee } from "../types/employee.types";
import { EmployeeActionMenu } from "./EmployeeActionMenu";
import { formatLabel } from "./FormField";
export { ToolbarDropdown } from "./EmployeeToolbarDropdown";
export { exportCsv, exportPdf } from "../lib/employeeExport";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const STATUS_STYLES: Record<string, string> = {
  new_onboard: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  archiving: "bg-yellow-100 text-yellow-700",
  archived: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  new_onboard: "Onboarding",
  active: "Active",
  archiving: "Archiving",
  archived: "Archived",
};

interface EmployeeTableProps {
  employees: Employee[];
  onArchive: (id: string) => void;
  isArchiving: boolean;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  adminMode?: boolean;
  canEdit?: boolean;
  canExport?: boolean;
  canManageRoles?: boolean;
  selectedIds: Set<string>;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  total: number;
  getStaleFields?: (emp: Employee) => Record<string, string>;
  allPagesSelected?: boolean;
  isSelectingAll?: boolean;
}

type SortField = "employee_code" | "name" | "email" | "job_title" | "department" | "location" | "status" | "role";
type SortDir = "asc" | "desc";

function sortEmployees(rows: Employee[], field: SortField, dir: SortDir): Employee[] {
  return [...rows].sort((a, b) => {
    let av = "", bv = "";
    if (field === "employee_code") { av = a.employee_code ?? ""; bv = b.employee_code ?? ""; }
    else if (field === "name") { av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; }
    else if (field === "email") { av = a.work_email; bv = b.work_email; }
    else if (field === "job_title") { av = a.job_title ?? ""; bv = b.job_title ?? ""; }
    else if (field === "department") { av = a.department ?? ""; bv = b.department ?? ""; }
    else if (field === "location") { av = a.location ?? ""; bv = b.location ?? ""; }
    else if (field === "status") { av = a.status; bv = b.status; }
    else if (field === "role") { av = a.roles.map((r) => r.role_name).join(", "); bv = b.roles.map((r) => r.role_name).join(", "); }
    const cmp = av.localeCompare(bv, undefined, { sensitivity: "base", numeric: true });
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <svg className="ml-auto h-3 w-3 flex-shrink-0 text-white/50" viewBox="0 0 10 14" fill="currentColor"><path d="M5 0L9 5H1L5 0Z" /><path d="M5 14L1 9H9L5 14Z" /></svg>;
  }
  return <svg className="ml-auto h-3 w-3 flex-shrink-0 text-white" viewBox="0 0 10 7" fill="currentColor">{dir === "asc" ? <path d="M5 0L10 7H0L5 0Z" /> : <path d="M5 7L0 0H10L5 7Z" />}</svg>;
}

export function EmployeeTable({
  employees, onArchive, isArchiving, hasNextPage, hasPrevPage, onNextPage, onPrevPage,
  adminMode = false, canEdit = true, canExport = true, canManageRoles = false, selectedIds, onToggleAll, onToggleOne,
  pageSize, onPageSizeChange, total, getStaleFields, allPagesSelected = false, isSelectingAll = false,
}: EmployeeTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const selectAllRef = useRef<HTMLInputElement>(null);

  function handleSort(field: SortField) {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else setSortField(null);
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const displayEmployees = sortField ? sortEmployees(employees, sortField, sortDir) : employees;
  const allSelected = employees.length > 0 && employees.every((e) => selectedIds.has(e.id));
  const someOnPage = employees.some((e) => selectedIds.has(e.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someOnPage && !allSelected && !allPagesSelected;
    }
  }, [someOnPage, allSelected, allPagesSelected]);

  if (employees.length === 0) {
    return <div className="rounded-lg border border-dashed border-border py-12 text-center"><p className="text-sm text-muted-foreground">No employees found.</p></div>;
  }

  const HEADER_COLS = ["name", "email", "job_title", "department", "location", "status", "role"] as const;
  const HEADER_LABELS = ["Name", "Email", "Title", "Department", "Location", "Status", "Role"];

  return (
    <div className="space-y-2">
      <div className="table-animate overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-orange-500 border-b border-orange-600">
            <tr>
              {adminMode && (
                <th className="w-10 px-4 py-3">
                  {isSelectingAll
                    ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    : <input ref={selectAllRef} type="checkbox" checked={allSelected || allPagesSelected} onChange={onToggleAll} disabled={isSelectingAll} className="h-4 w-4 cursor-pointer rounded border-white/50 accent-white" />
                  }
                </th>
              )}
              <th onClick={() => handleSort("employee_code")} className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white hover:text-orange-100 whitespace-nowrap">
                <span className="flex items-center gap-1">ID <SortIcon active={sortField === "employee_code"} dir={sortDir} /></span>
              </th>
              {HEADER_COLS.map((f, i) => (
                <th key={f} onClick={() => handleSort(f)} className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white hover:text-orange-100">
                  <span className="flex items-center gap-1">{HEADER_LABELS[i]} <SortIcon active={sortField === f} dir={sortDir} /></span>
                </th>
              ))}
              <th className="w-36 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayEmployees.map((emp) => {
              const staleFields = getStaleFields ? getStaleFields(emp) : {} as Record<string, string>;
              const isStale = Object.keys(staleFields).length > 0;
              return (
                <tr key={emp.id} className={`hover:bg-orange-500/5 ${isStale ? "bg-orange-500/15 shadow-[inset_4px_0_0_0_rgb(249,115,22)]" : selectedIds.has(emp.id) ? "bg-primary/5" : ""}`}>
                  {adminMode && <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(emp.id)} onChange={() => onToggleOne(emp.id)} className="h-4 w-4 cursor-pointer rounded border-input accent-primary" /></td>}
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{emp.employee_code ?? "—"}</td>
                  <td className="truncate px-4 py-3 text-sm font-medium text-card-foreground">{emp.first_name} {emp.last_name}</td>
                  <td className="truncate px-4 py-3 text-sm text-muted-foreground">{emp.work_email}</td>
                  <td className="truncate px-4 py-3 text-sm text-muted-foreground">{emp.job_title ?? "—"}</td>
                  <td className="truncate px-4 py-3 text-sm text-muted-foreground">{emp.department ? formatLabel(emp.department) : "—"}</td>
                  <td className="truncate px-4 py-3 text-sm text-muted-foreground">{emp.location ? formatLabel(emp.location) : "—"}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[emp.status] ?? "bg-muted text-muted-foreground"}`}>{STATUS_LABELS[emp.status] ?? emp.status}</span></td>
                  <td className="truncate px-4 py-3 text-sm text-muted-foreground">{emp.roles.length > 0 ? emp.roles.map((r) => r.role_name).join(", ") : "—"}</td>
                  <td className="overflow-hidden px-4 py-3">
                    <EmployeeActionMenu employee={emp} adminMode={adminMode} canEdit={canEdit} canExport={canExport} canManageRoles={canManageRoles} isArchiving={isArchiving} onArchive={onArchive} staleFields={staleFields} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button key={size} onClick={() => onPageSizeChange(size)} className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${pageSize === size ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>{size}</button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">{total} total</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onPrevPage} disabled={!hasPrevPage} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40">← Previous</button>
          <button onClick={onNextPage} disabled={!hasNextPage} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40">Next →</button>
        </div>
      </div>
    </div>
  );
}
