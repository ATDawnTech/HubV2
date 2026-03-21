import type { Employee } from "../types/employee.types";
import { HIRE_TYPE_LABELS, WORK_MODE_LABELS, InfoRow } from "./employeeViewHelpers";

interface Props {
  emp: Employee;
  staleFields: Record<string, string>;
}

export function EmployeeDetailSections({ emp, staleFields }: Props) {
  return (
    <div className="space-y-4">
      <section className={`rounded-lg border p-6 ${Object.keys(staleFields).length > 0 ? "border-orange-400 bg-orange-500/5" : "border-border bg-card"}`}>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Employee Details
          </h2>
          {Object.keys(staleFields).length > 0 && (
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
              Update Required
            </span>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <InfoRow label="Work Email" value={emp.work_email} />
          <InfoRow label="Job Title" value={emp.job_title} />
          <InfoRow label="Department" value={emp.department} staleReason={staleFields["department"]} />
          <InfoRow label="Location" value={emp.location} staleReason={staleFields["location"]} />
          <InfoRow label="Hire Type" value={HIRE_TYPE_LABELS[emp.hire_type ?? ""] ?? emp.hire_type} staleReason={staleFields["hire_type"]} />
          <InfoRow label="Work Mode" value={WORK_MODE_LABELS[emp.work_mode ?? ""] ?? emp.work_mode} staleReason={staleFields["work_mode"]} />
          <InfoRow label="Hire Date" value={emp.hire_date} />
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Assets</h2>
        <p className="text-sm text-muted-foreground">Asset tracking available when Epic 4 is connected.</p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Assigned Projects</h2>
        <p className="text-sm text-muted-foreground">Project assignments available when Epic 7 is connected.</p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Project History</h2>
        <p className="text-sm text-muted-foreground">Project history available when Epic 7 is connected.</p>
      </section>
    </div>
  );
}
