import { useEffect, useRef, useState } from "react";
import { useManagerSearch } from "../hooks/useManagerSearch";
import { inputClass, formatLabel } from "./FormField";
import type { Employee } from "../types/employee.types";

interface Props {
  value: string;
  onSelect: (id: string) => void;
  onClear: () => void;
}

/**
 * Status-enforced manager search picker (spec 2.7).
 * Only active/new_onboard employees are shown — archiving/archived are excluded.
 */
export function ManagerPickerField({ value, onSelect, onClear }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { query, setQuery, results, isLoading: loading, debouncedQuery, clearResults } = useManagerSearch();

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function handleSelect(emp: Employee) {
    const name = `${emp.first_name} ${emp.last_name}`;
    setDisplayName(name);
    clearResults();
    setOpen(false);
    onSelect(emp.id);
  }

  function handleClear() {
    setDisplayName("");
    clearResults();
    onClear();
  }

  if (value && !open) {
    return (
      <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <span className="text-foreground">{displayName}</span>
        <button
          type="button"
          onClick={() => { setOpen(true); setQuery(""); }}
          aria-label="Change manager"
          className="ml-2 text-xs text-muted-foreground hover:text-destructive"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name…"
        className={inputClass}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading || (debouncedQuery.trim().length > 0 && !loading)) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          {loading && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
          {!loading && debouncedQuery && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No active employees found.</p>
          )}
          {results.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => handleSelect(emp)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-orange-500/10"
            >
              <span className="font-medium text-card-foreground">{emp.first_name} {emp.last_name}</span>
              {emp.job_title && <span className="text-xs text-muted-foreground">· {emp.job_title}</span>}
              {emp.department && (
                <span className="ml-auto text-xs text-muted-foreground">{formatLabel(emp.department)}</span>
              )}
            </button>
          ))}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="flex w-full items-center border-t border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
