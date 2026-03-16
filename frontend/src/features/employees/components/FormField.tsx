/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";

export function Field({
  label,
  id,
  error,
  staleReason,
  children,
}: {
  label: string;
  id: string;
  error?: string | undefined;
  staleReason?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={staleReason ? "rounded-lg border border-orange-400 bg-orange-500/5 p-2 -m-2" : ""}>
      <label htmlFor={id} className={`mb-1 block text-sm font-medium ${staleReason ? "text-orange-600" : "text-foreground"}`}>
        {label}
        {staleReason && (
          <span className="ml-1.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
            ⚠ {staleReason}
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring aria-[invalid=true]:border-destructive";

export function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
