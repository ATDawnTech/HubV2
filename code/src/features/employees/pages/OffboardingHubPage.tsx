import { Link } from "react-router-dom";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useOffboardingEmployees } from "../hooks/useOffboardingEmployees";
import { OffboardingCard } from "../components/OffboardingCard";

export function OffboardingHubPage(): JSX.Element {
  const offboarding = useOffboardingEmployees();

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Offboarding Hub</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Employees pending decommissioning checks
          </p>
        </div>
        <Link
          to="/employees"
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
        >
          Back to Directory
        </Link>
      </div>

      {offboarding.isLoading && <LoadingSpinner message="Loading offboarding queue…" />}

      {offboarding.isError && (
        <ErrorMessage message="Could not load offboarding queue." onRetry={() => offboarding.refetch()} />
      )}

      {offboarding.data?.items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No employees currently offboarding.</p>
        </div>
      )}

      {offboarding.data && offboarding.data.items.length > 0 && (
        <div className="space-y-4">
          {offboarding.data.items.map((item) => (
            <OffboardingCard key={item.employee.id} item={item} />
          ))}
        </div>
      )}

      {(offboarding.hasPrevPage || offboarding.hasNextPage) && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={offboarding.goToPrevPage}
            disabled={!offboarding.hasPrevPage}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={offboarding.goToNextPage}
            disabled={!offboarding.hasNextPage}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
