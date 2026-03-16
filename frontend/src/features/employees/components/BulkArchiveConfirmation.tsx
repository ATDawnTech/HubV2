import type { Employee } from "../types/employee.types";

interface Props {
  employees: Employee[];
  isArchiving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for bulk-archiving a set of employees.
 * P3: extracted from EmployeeListPage.
 */
export function BulkArchiveConfirmation({ employees, isArchiving, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold text-card-foreground">
            Archive {employees.length} Employee{employees.length !== 1 ? "s" : ""}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This will begin the offboarding process for the following employees:
          </p>
          <ul className="mt-3 space-y-1">
            {employees.map((e) => (
              <li key={e.id} className="text-sm font-medium text-card-foreground">
                {e.first_name} {e.last_name}
                {e.employee_code && (
                  <span className="ml-1 font-mono text-xs text-muted-foreground">
                    ({e.employee_code})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isArchiving}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isArchiving ? "Archiving…" : "Yes, Archive All"}
          </button>
        </div>
      </div>
    </div>
  );
}
