import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { usePermissions } from "@/hooks/usePermissions";
import { EmployeeForm } from "../components/EmployeeForm";
import { EmployeeDetailSections } from "../components/EmployeeDetailSections";
import { useArchiveEmployee } from "../hooks/useArchiveEmployee";
import { useEmployee } from "../hooks/useEmployee";
import { useUpdateEmployee } from "../hooks/useUpdateEmployee";
import { useStaleFieldDetector } from "../hooks/useStaleFieldDetector";
import { STATUS_LABELS, STATUS_STYLES } from "../components/employeeViewHelpers";
import type { UpdateEmployeeFormValues } from "../schemas/employee.schemas";

export function EmployeeDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [editMode, setEditMode] = useState(searchParams.get("edit") === "true");

  const employee = useEmployee(id ?? "");
  const updateEmployee = useUpdateEmployee(id ?? "");
  const archiveEmployee = useArchiveEmployee();
  const { getStaleFields } = useStaleFieldDetector();
  const { hasPermission } = usePermissions();
  const canViewInEntra = hasPermission("admin", "manage_entra_sync");

  // Clear ?edit=true from URL once edit mode activates
  useEffect(() => {
    if (searchParams.get("edit") === "true") {
      navigate(`/employees/${id}`, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUpdate(data: UpdateEmployeeFormValues): void {
    updateEmployee.mutate(data, {
      onSuccess: () => setEditMode(false),
    });
  }

  function handleArchive(): void {
    if (!id) return;
    archiveEmployee.mutate(id, {
      onSuccess: () => navigate("/employees"),
    });
  }

  if (employee.isLoading) return <LoadingSpinner message="Loading employee…" />;

  if (employee.isError || !employee.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorMessage message="Employee not found." onRetry={() => employee.refetch()} />
      </div>
    );
  }

  const emp = employee.data;
  const canArchive = emp.status === "active" || emp.status === "new_onboard";
  const staleFields = getStaleFields(emp);

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {emp.employee_code && (
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {emp.employee_code}
              </span>
            )}
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[emp.status] ?? "bg-muted text-muted-foreground"}`}>
              {STATUS_LABELS[emp.status] ?? emp.status}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {emp.first_name} {emp.last_name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{emp.work_email}</p>
        </div>

        <div className="flex items-center gap-2">
          {canViewInEntra && emp.entra_oid && (
            <a
              href={`https://entra.microsoft.com/#view/Microsoft_AAD_UsersAndTenants/UserProfileMenuBlade/~/overview/userId/${emp.entra_oid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
            >
              View in Entra
            </a>
          )}
          <button
            onClick={() => navigate("/employees")}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
          >
            Back
          </button>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => setEditMode(false)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
            >
              Cancel
            </button>
          )}
          {canArchive && (
            <button
              onClick={handleArchive}
              disabled={archiveEmployee.isPending}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {archiveEmployee.isPending ? "Archiving…" : "Archive"}
            </button>
          )}
        </div>
      </div>

      {!editMode && <EmployeeDetailSections emp={emp} staleFields={staleFields} />}

      {editMode && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Edit Details
          </h2>
          <EmployeeForm
            mode="edit"
            onSubmit={handleUpdate}
            isSubmitting={updateEmployee.isPending}
            defaultValues={emp}
          />
          {updateEmployee.isError && (
            <div className="mt-4">
              <ErrorMessage message="Failed to save changes. Please try again." />
            </div>
          )}
          {updateEmployee.isSuccess && (
            <p className="mt-4 text-sm text-primary">Changes saved.</p>
          )}
        </div>
      )}
    </main>
  );
}
