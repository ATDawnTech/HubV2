import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { employeeService } from "@/services/employee.service";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function AccountSettingsPage(): JSX.Element {
  const { employeeId } = useAuth();

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", employeeId, "profile"],
    queryFn: () => employeeService.getEmployee(employeeId!),
    enabled: Boolean(employeeId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <LoadingSpinner message="Loading account..." />;

  return (
    <main className="px-8 py-8">
      <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your profile and preferences.
      </p>

      {/* Profile card */}
      {employee && (
        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Profile
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</dt>
              <dd className="mt-0.5 text-sm text-card-foreground">{employee.first_name} {employee.last_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="mt-0.5 text-sm text-card-foreground">{employee.work_email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Job Title</dt>
              <dd className="mt-0.5 text-sm text-card-foreground">{employee.job_title ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Department</dt>
              <dd className="mt-0.5 text-sm text-card-foreground">{employee.department ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</dt>
              <dd className="mt-0.5 text-sm text-card-foreground">{employee.location ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Employee Code</dt>
              <dd className="mt-0.5 font-mono text-sm text-card-foreground">{employee.employee_code ?? "—"}</dd>
            </div>
          </dl>
        </section>
      )}

      {/* Preferences placeholder */}
      <section className="mt-4 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preferences
        </h2>
        <p className="text-sm text-muted-foreground">
          User preferences and notification settings will be available in a future update.
        </p>
      </section>

      {/* Security placeholder */}
      <section className="mt-4 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Security
        </h2>
        <p className="text-sm text-muted-foreground">
          Password management and SSO configuration will be available when Epic 4 (Auth) is connected.
        </p>
      </section>
    </main>
  );
}
