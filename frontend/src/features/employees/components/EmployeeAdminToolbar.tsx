import { useState } from "react";
import { ToolbarDropdown } from "./EmployeeToolbarDropdown";
import { exportCsv, exportPdf } from "../lib/employeeExport";
import { toast } from "@/lib/toast";
import type { Employee } from "../types/employee.types";

interface Props {
  canExport: boolean;
  selection: {
    someSelected: boolean;
    selectedIds: Set<string>;
    archivableSelected: Employee[];
  };
  getExportRows: () => Promise<Employee[]>;
  onBulkArchive: () => void;
  onImport: () => void;
}

export function EmployeeAdminToolbar({ canExport, selection, getExportRows, onBulkArchive, onImport }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExportCsv() {
    setIsExporting(true);
    try {
      const rows = await getExportRows();
      exportCsv(rows, "employees.csv");
    } catch { toast.error("Failed to fetch employees for export."); }
    finally { setIsExporting(false); }
  }

  async function handleExportPdf() {
    setIsExporting(true);
    try {
      const rows = await getExportRows();
      exportPdf(rows);
    } catch { toast.error("Failed to fetch employees for export."); }
    finally { setIsExporting(false); }
  }

  return (
    <>
      {selection.someSelected && (
        <span className="text-xs font-medium text-orange-500">{selection.selectedIds.size} selected</span>
      )}
      <ToolbarDropdown label="Admin Actions">
        <button
          disabled={selection.archivableSelected.length === 0}
          onClick={onBulkArchive}
          className="block w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Archive Selected ({selection.archivableSelected.length})
        </button>
      </ToolbarDropdown>
      <button
        onClick={onImport}
        className="flex items-center gap-1.5 rounded-md border border-orange-500 px-3 py-1.5 text-sm font-medium text-orange-500 transition-colors hover:bg-orange-500/10"
      >
        ↑ Import
      </button>
      {canExport && (
        <ToolbarDropdown label={`Export${selection.someSelected ? ` (${selection.selectedIds.size})` : ""}`}>
          <button
            onClick={() => { void handleExportCsv(); }}
            disabled={isExporting}
            className="block w-full px-4 py-2 text-left text-sm text-card-foreground hover:bg-muted disabled:opacity-50"
          >
            {isExporting ? "Exporting…" : `Export as CSV${selection.someSelected ? ` (${selection.selectedIds.size})` : ""}`}
          </button>
          <button
            onClick={() => { void handleExportPdf(); }}
            disabled={isExporting}
            className="block w-full px-4 py-2 text-left text-sm text-card-foreground hover:bg-muted disabled:opacity-50"
          >
            {isExporting ? "Exporting…" : `Export as PDF${selection.someSelected ? ` (${selection.selectedIds.size})` : ""}`}
          </button>
        </ToolbarDropdown>
      )}
      <div className="h-6 w-px bg-border" />
    </>
  );
}
