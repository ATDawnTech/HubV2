/**
 * EntraSyncPanel — trigger and monitor Entra directory sync.
 *
 * Shows last sync status, next sync countdown, and provides a manual "Sync Now" button.
 * Auto-sync runs on the backend at the configured interval.
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { entraSyncService } from "@/services/entra-sync.service";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface CountdownParts {
  hours: string;
  minutes: string;
  seconds: string;
}

function getCountdownParts(targetIso: string): CountdownParts | null {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return null;

  return {
    hours: String(Math.floor(diff / 3_600_000)).padStart(2, "0"),
    minutes: String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0"),
    seconds: String(Math.floor((diff % 60_000) / 1_000)).padStart(2, "0"),
  };
}

function useCountdown(targetIso: string | null | undefined): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(
    targetIso ? getCountdownParts(targetIso) : null,
  );

  useEffect(() => {
    if (!targetIso) {
      setParts(null);
      return;
    }
    setParts(getCountdownParts(targetIso));

    const id = setInterval(() => {
      const val = getCountdownParts(targetIso);
      setParts(val);
      if (!val) clearInterval(id);
    }, 1_000);

    return () => clearInterval(id);
  }, [targetIso]);

  return parts;
}

function CountdownTimer({ parts }: { parts: CountdownParts }) {
  return (
    <div className="flex items-center gap-1.5">
      {[
        { value: parts.hours, label: "hr" },
        { value: parts.minutes, label: "min" },
        { value: parts.seconds, label: "sec" },
      ].map(({ value, label }, i) => (
        <div key={label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-lg font-bold text-muted-foreground">:</span>}
          <div className="flex flex-col items-center">
            <span className="rounded-md bg-muted/60 px-2.5 py-1 font-mono text-2xl font-bold tabular-nums text-foreground">
              {value}
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EntraSyncPanel() {
  const queryClient = useQueryClient();
  const [syncError, setSyncError] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["entra-sync-status"],
    queryFn: () => entraSyncService.getSyncStatus(),
    staleTime: 30_000,
  });

  const countdown = useCountdown(status?.next_run_at);

  const syncMutation = useMutation({
    mutationFn: entraSyncService.triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entra-sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setSyncError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setSyncError(msg ?? "Sync failed. Check that Entra permissions are configured.");
    },
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Directory Sync
          </h3>
          <p className="text-sm text-muted-foreground">
            Pull all members from mapped Entra security groups into the employee directory.
            New members are provisioned automatically; existing records are updated with
            the latest name, email, job title, and department from Entra.
          </p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {syncMutation.isPending ? "Syncing\u2026" : "Sync Now"}
        </button>
      </div>

      {syncError && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{syncError}</p>
      )}

      {/* Next sync countdown */}
      {countdown && (
        <div className="mt-5 rounded-md border border-border bg-muted/30 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next Auto-Sync
          </p>
          <CountdownTimer parts={countdown} />
        </div>
      )}

      {/* Last sync results */}
      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading sync status\u2026</p>
        ) : !status?.synced_at ? (
          <p className="text-sm text-muted-foreground">No sync has run yet.</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Last synced:{" "}
              <span className="font-medium text-foreground">{formatDate(status.synced_at)}</span>
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Created", value: status.created, color: "text-green-600 dark:text-green-400" },
                { label: "Updated", value: status.updated, color: "text-blue-600 dark:text-blue-400" },
                { label: "Skipped", value: status.skipped, color: "text-muted-foreground" },
                { label: "Errors", value: status.errors, color: "text-red-600 dark:text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-md border border-border bg-muted/40 px-4 py-3 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
