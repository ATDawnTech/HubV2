import { useState } from "react";
import type { Skill } from "../types/skill-management.types";

interface CategoryInfo {
  name: string | null;
  count: number;
  skillIds: string[];
}

interface Props {
  skills: Skill[];
  onClose: () => void;
  onMigrate: (from: string | null, to: string | null) => void;
  onBulkDelete: (ids: string[]) => void;
  isMigrating: boolean;
}

function GroupRow({ info, allCategories, onMigrate, onBulkDelete, isMigrating }: {
  info: CategoryInfo;
  allCategories: (string | null)[];
  onMigrate: (from: string | null, to: string | null) => void;
  onBulkDelete: (ids: string[]) => void;
  isMigrating: boolean;
}) {
  const [action, setAction] = useState<"migrate" | "delete" | null>(null);
  const [target, setTarget] = useState("");

  const others = allCategories.filter((c) => c !== info.name);

  function confirmMigrate() {
    const to = target === "__null__" ? null : target || null;
    onMigrate(info.name, to);
    setAction(null);
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {info.name ?? <span className="italic text-muted-foreground">Uncategorized</span>}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {info.count}
          </span>
        </div>
        {action === null && (
          <div className="ml-2 flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => { setTarget(""); setAction("migrate"); }}
              className="rounded px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Migrate
            </button>
            <button type="button" onClick={() => setAction("delete")}
              className="rounded px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10">
              Delete
            </button>
          </div>
        )}
      </div>

      {action === "migrate" && (
        <div className="space-y-2 border-t border-border px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            Move {info.count} skill{info.count !== 1 ? "s" : ""} to:
          </p>
          <select value={target} onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
            <option value="">Pick a group…</option>
            <option value="__null__">Uncategorized</option>
            {others.filter(Boolean).map((c) => <option key={c!} value={c!}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="button" disabled={!target || isMigrating} onClick={confirmMigrate}
              className="rounded bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90">
              {isMigrating ? "Moving…" : "Confirm"}
            </button>
            <button type="button" onClick={() => setAction(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {action === "delete" && (
        <div className="space-y-2 border-t border-border px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            {info.count} skill{info.count !== 1 ? "s" : ""} in this group:
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { onBulkDelete(info.skillIds); setAction(null); }}
              className="rounded bg-destructive px-3 py-1 text-[11px] font-medium text-destructive-foreground hover:bg-destructive/90">
              Delete all
            </button>
            <button type="button" onClick={() => { onMigrate(info.name, null); setAction(null); }}
              className="rounded border border-border px-3 py-1 text-[11px] font-medium text-foreground hover:bg-muted">
              Uncategorize
            </button>
            <button type="button" onClick={() => setAction(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SkillGroupsPanel({ skills, onClose, onMigrate, onBulkDelete, isMigrating }: Props): JSX.Element {
  const categoryMap = new Map<string | null, { count: number; ids: string[] }>();
  for (const s of skills) {
    const key = s.category ?? null;
    const entry = categoryMap.get(key) ?? { count: 0, ids: [] };
    entry.count++;
    entry.ids.push(s.id);
    categoryMap.set(key, entry);
  }

  const groups: CategoryInfo[] = [...categoryMap.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b);
    })
    .map(([name, { count, ids }]) => ({ name, count, skillIds: ids }));

  const allCategories = groups.map((g) => g.name);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Skill Groups</h3>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            {groups.length} group{groups.length !== 1 ? "s" : ""}
          </span>
          <button type="button" onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground">✕</button>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {groups.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No groups yet.</p>
        )}
        {groups.map((g) => (
          <GroupRow key={g.name ?? "__null__"} info={g} allCategories={allCategories}
            onMigrate={onMigrate} onBulkDelete={onBulkDelete} isMigrating={isMigrating} />
        ))}
      </div>
    </div>
  );
}
