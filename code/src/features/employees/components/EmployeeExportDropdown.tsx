import { useRef, useState, useEffect } from "react";
import { exportCsv, exportPdf } from "../lib/employeeExport";
import type { Employee } from "../types/employee.types";

export function EmployeeExportDropdown({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90"
      >
        Export
        <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-8 z-20 min-w-[160px] rounded-md border border-border bg-card shadow-lg"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => exportCsv([employee], `${employee.employee_code ?? employee.id}.csv`)}
            className="block w-full px-4 py-2 text-left text-sm font-medium text-orange-600 hover:bg-orange-500/10"
          >
            Export as CSV
          </button>
          <button
            onClick={() => exportPdf([employee])}
            className="block w-full px-4 py-2 text-left text-sm font-medium text-orange-600 hover:bg-orange-500/10"
          >
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}
