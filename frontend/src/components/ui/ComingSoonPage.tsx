import { Link } from "react-router-dom";

export function ComingSoonPage({ title }: { title?: string }): JSX.Element {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-primary"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        {title ?? "Coming Soon"}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This module is under development and will be available in a future update.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Back to Dashboard
      </Link>
    </main>
  );
}
