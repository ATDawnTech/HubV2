import { useState } from "react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useCreateDropdown } from "../hooks/useCreateDropdown";
import { useUpdateDropdown } from "../hooks/useUpdateDropdown";
import { useDropdownsByModule } from "../hooks/useDropdownsByModule";
import { DropdownOptionRow, toStorageValue } from "./DropdownOptionRow";
import type { DropdownOption } from "../types/admin-settings.types";

interface Props {
  module: string;
  category: string;
  categoryLabel: string;
}

export function DropdownAreaPanel({ module, category, categoryLabel }: Props): JSX.Element {
  const query = useDropdownsByModule(module, category);
  const createDropdown = useCreateDropdown();
  const updateDropdown = useUpdateDropdown();
  const [newValue, setNewValue] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  function handleAdd(): void {
    const storage = toStorageValue(newValue);
    if (!storage) return;
    createDropdown.mutate(
      { module, category, value: storage, sort_order: (query.data?.options.length ?? 0) + 1 },
      { onSuccess: () => setNewValue("") },
    );
  }

  function handleMove(options: DropdownOption[], index: number, direction: -1 | 1): void {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= options.length) return;
    const a = options[index]!;
    const b = options[swapIndex]!;
    updateDropdown.mutate({ id: a.id, sort_order: b.sort_order });
    updateDropdown.mutate({ id: b.id, sort_order: a.sort_order });
    setSortDir(null);
  }

  function handleSort(options: DropdownOption[], dir: "asc" | "desc"): void {
    const sorted = [...options].sort((a, b) =>
      dir === "asc" ? a.value.localeCompare(b.value) : b.value.localeCompare(a.value),
    );
    sorted.forEach((opt, i) => {
      if (opt.sort_order !== i + 1) {
        updateDropdown.mutate({ id: opt.id, sort_order: i + 1 });
      }
    });
  }

  function toggleSort(options: DropdownOption[]): void {
    const next = sortDir === "asc" ? "desc" : "asc";
    setSortDir(next);
    handleSort(options, next);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <div className="flex items-center gap-2">
          {query.data && query.data.options.length > 1 && (
            <button
              onClick={() => toggleSort(query.data.options)}
              disabled={updateDropdown.isPending}
              title={sortDir === "asc" ? "Currently A→Z, click for Z→A" : sortDir === "desc" ? "Currently Z→A, click for A→Z" : "Sort alphabetically"}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                sortDir
                  ? "border-orange-500 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
                  : "border-border text-muted-foreground hover:border-orange-500 hover:text-orange-500"
              }`}
            >
              <span className="flex flex-col gap-[2px]">
                <span className="block h-[2px] w-3 rounded-full bg-current" />
                <span className="block h-[2px] w-2 rounded-full bg-current" />
                <span className="block h-[2px] w-1 rounded-full bg-current" />
              </span>
              {sortDir === "asc" ? (
                <span className="flex items-center gap-0.5">A <span className="text-[10px]">↑</span> Z</span>
              ) : sortDir === "desc" ? (
                <span className="flex items-center gap-0.5">Z <span className="text-[10px]">↓</span> A</span>
              ) : (
                <span>Sort</span>
              )}
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {query.data?.options.length ?? 0} values
          </span>
        </div>
      </div>

      {query.isLoading && <LoadingSpinner message="Loading…" />}

      {query.isError && (
        <ErrorMessage
          message="Failed to load dropdown values."
          onRetry={() => query.refetch()}
        />
      )}

      {query.data && (
        <div className="space-y-1.5">
          {query.data.options.length === 0 && (
            <p className="rounded-md border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
              No values yet — add the first one below.
            </p>
          )}
          {query.data.options.map((opt, index) => {
            const otherActive = query.data.options.filter(
              (o) => o.id !== opt.id && o.is_active,
            );
            return (
              <DropdownOptionRow
                key={opt.id}
                option={opt}
                otherActiveOptions={otherActive}
                isFirst={index === 0}
                isLast={index === query.data.options.length - 1}
                onMoveUp={() => handleMove(query.data.options, index, -1)}
                onMoveDown={() => handleMove(query.data.options, index, 1)}
              />
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          placeholder={`Add new ${categoryLabel.toLowerCase()} value…`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={handleAdd}
          disabled={!newValue.trim() || createDropdown.isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createDropdown.isPending ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
