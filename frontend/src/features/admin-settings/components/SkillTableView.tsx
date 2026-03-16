import type { Skill } from "../types/skill-management.types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type SortField = "name" | "date" | "intake";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg className="ml-1 inline h-3 w-3 flex-shrink-0 text-white/40" viewBox="0 0 10 14" fill="currentColor">
        <path d="M5 0L9 5H1L5 0Z" /><path d="M5 14L1 9H9L5 14Z" />
      </svg>
    );
  }
  return (
    <svg className="ml-1 inline h-3 w-3 flex-shrink-0 text-white" viewBox="0 0 10 7" fill="currentColor">
      {dir === "asc" ? <path d="M5 0L10 7H0L5 0Z" /> : <path d="M5 7L0 0H10L5 7Z" />}
    </svg>
  );
}

interface Props {
  skills: Skill[];
  isLoading: boolean;
  isError: boolean;
  searchInput: string;
  categoryFilter: string | null;
  selected: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  sortField: SortField;
  sortDir: SortDir;
  pageSize: number;
  onSort: (field: SortField) => void;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onDelete: (skill: Skill) => void;
}

export function SkillTableView({
  skills, isLoading, isError, searchInput, categoryFilter,
  selected, allSelected, someSelected, sortField, sortDir, pageSize, onSort,
  onToggleAll, onToggleOne, onDelete,
}: Props): JSX.Element {
  return (
    <>
      <div className="table-animate rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : isError ? (
          <div className="px-5 py-8 text-center text-sm text-destructive">Failed to load skills.</div>
        ) : skills.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            {searchInput || categoryFilter ? "No skills match your filters." : "No skills yet. Add one above."}
          </div>
        ) : (
          <table className="w-full table-fixed divide-y divide-border">
            <thead>
              <tr className="bg-orange-500">
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all skills"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={onToggleAll}
                    className="rounded border-white/50 accent-white"
                  />
                </th>
                <th
                  onClick={() => onSort("name")}
                  className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white hover:text-orange-100"
                >
                  Skill Name <SortIcon active={sortField === "name"} dir={sortDir} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Category</th>
                <th
                  onClick={() => onSort("intake")}
                  className="w-24 cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white hover:text-orange-100"
                >
                  Intake <SortIcon active={sortField === "intake"} dir={sortDir} />
                </th>
                <th
                  onClick={() => onSort("date")}
                  className="w-32 cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white hover:text-orange-100"
                >
                  Date Added <SortIcon active={sortField === "date"} dir={sortDir} />
                </th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {skills.map((skill) => (
                <tr key={skill.id} className={selected.has(skill.id) ? "bg-primary/5" : "hover:bg-muted/30"}>
                  <td className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${skill.name}`}
                      checked={selected.has(skill.id)}
                      onChange={() => onToggleOne(skill.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="truncate px-4 py-3 text-sm font-medium text-foreground">{skill.name}</td>
                  <td className="truncate px-4 py-3 text-sm text-muted-foreground">{skill.category ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {skill.intake_count > 0 ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{skill.intake_count}</span>
                    ) : (
                      <span className="text-muted-foreground/50">0</span>
                    )}
                  </td>
                  <td className="truncate px-4 py-3 text-sm text-muted-foreground">{formatDate(skill.created_at)}</td>
                  <td className="w-16 px-4 py-3 text-right">
                    <button onClick={() => onDelete(skill)} aria-label={`Remove ${skill.name}`} className="text-xs text-muted-foreground/50 hover:text-destructive">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, pageSize - skills.length) }).map((_, i) => (
                <tr key={`spacer-${i}`} aria-hidden="true">
                  <td className="px-4 py-3" colSpan={6}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </>
  );
}
