import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useSkills } from "../hooks/useSkills";
import { useSkillCategories } from "../hooks/useSkillCategories";
import { useCreateSkill } from "../hooks/useCreateSkill";
import { useDeleteSkill } from "../hooks/useDeleteSkill";
import { useBulkDeleteSkills } from "../hooks/useBulkDeleteSkills";
import { useRecategorizeSkills } from "../hooks/useRecategorizeSkills";
import { SkillLabelGrid } from "./SkillLabelGrid";
import { SkillConfirmDialog } from "./SkillConfirmDialog";
import { SkillCategoryFilter } from "./SkillCategoryFilter";
import { SkillTableView } from "./SkillTableView";
import { CategoryCombobox } from "./CategoryCombobox";
import { SkillGroupsPanel } from "./SkillGroupsPanel";
import type { Skill } from "../types/skill-management.types";

const createSkillSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).trim(),
  category: z.string().max(255).trim().optional(),
});
type CreateSkillFormValues = z.infer<typeof createSkillSchema>;

type ViewMode = "table" | "labels";

// Map frontend sort field names to backend param names
const SORT_BY_MAP = {
  name: "name",
  date: "created_at",
  intake: "usage_count",
} as const;

export function SkillManagementPanel(): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>("labels");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"name" | "date" | "intake">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [showGroups, setShowGroups] = useState(false);

  const { register, handleSubmit, reset, setFocus, setValue, watch, formState: { errors, isValid } } = useForm<CreateSkillFormValues>({
    resolver: zodResolver(createSkillSchema),
    mode: "onChange",
    defaultValues: { name: "", category: "" },
  });
  const categoryValue = watch("category") ?? "";

  // Reset to page 0 whenever filters or sort change
  useEffect(() => { setPage(0); setSelected(new Set()); }, [debouncedSearch, categoryFilter, sortField, sortDir, pageSize]);
  useEffect(() => { setSelected(new Set()); }, [viewMode]);

  // Server-side paginated query
  const { data, isLoading, isError } = useSkills({
    search: debouncedSearch || undefined,
    sort_by: SORT_BY_MAP[sortField],
    sort: sortDir,
    limit: pageSize,
    offset: page * pageSize,
    category: categoryFilter || undefined,
  });

  // Separate query for groups panel — only fetches when panel is open
  const { data: groupsData } = useSkills({ limit: 500 }, { enabled: showGroups });

  const { categories } = useSkillCategories();
  const skills = data?.skills ?? [];
  const totalSkills = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalSkills / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const allSkills = groupsData?.skills ?? [];

  const createSkill = useCreateSkill();
  const deleteSkill = useDeleteSkill();
  const bulkDelete = useBulkDeleteSkills();
  const recategorize = useRecategorizeSkills();
  const isDeleting = deleteSkill.isPending || bulkDelete.isPending;

  const allSelected = skills.length > 0 && skills.every((s) => selected.has(s.id));
  const someSelected = skills.some((s) => selected.has(s.id)) && !allSelected;

  function handleSort(field: "name" | "date" | "intake") {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); skills.forEach((s) => next.delete(s.id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); skills.forEach((s) => next.add(s.id)); return next; });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function onCreateSubmit(values: CreateSkillFormValues) {
    createSkill.mutate(
      { name: values.name, category: values.category || null },
      { onSuccess: () => { reset(); setFocus("name"); } },
    );
  }

  function requestDeleteOne(skill: Skill) {
    setConfirmDelete({ ids: [skill.id], label: `Are you sure you want to remove "${skill.name}"? This cannot be undone.` });
  }

  function requestBulkDelete() {
    const count = selected.size;
    setConfirmDelete({ ids: [...selected], label: `Are you sure you want to remove ${count} skill${count === 1 ? "" : "s"}? This cannot be undone.` });
  }

  function executeConfirmedDelete() {
    if (!confirmDelete) return;
    const { ids } = confirmDelete;
    if (ids.length === 1) {
      deleteSkill.mutate(ids[0]!, {
        onSuccess: () => { setSelected((prev) => { const next = new Set(prev); next.delete(ids[0]!); return next; }); setConfirmDelete(null); },
        onError: () => setConfirmDelete(null),
      });
    } else {
      bulkDelete.mutate(ids, {
        onSuccess: () => { setSelected(new Set()); setConfirmDelete(null); },
        onError: () => setConfirmDelete(null),
      });
    }
  }

  return (
    <div className="flex gap-6">
      {/* ── Main panel ── */}
      <div className="min-w-0 flex-1 space-y-6">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="flex items-end gap-3" noValidate>
          <div className="flex-1">
            <label htmlFor="skill-name" className="mb-1 block text-xs font-medium text-muted-foreground">Skill Name</label>
            <input
              id="skill-name"
              {...register("name")}
              placeholder="e.g. TypeScript"
              autoComplete="off"
              aria-describedby={errors.name ? "skill-name-error" : undefined}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {errors.name && <p id="skill-name-error" role="alert" className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="w-48">
            <label htmlFor="skill-category" className="mb-1 block text-xs font-medium text-muted-foreground">Category (optional)</label>
            <CategoryCombobox
              value={categoryValue}
              onChange={(v) => setValue("category", v, { shouldValidate: true })}
              categories={categories}
            />
          </div>
          <button type="submit" disabled={!isValid || createSkill.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {createSkill.isPending ? "Adding…" : "Add Skill"}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <SkillCategoryFilter categories={categories} selected={categoryFilter} onChange={setCategoryFilter} />
          <input aria-label="Search skills" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search skills…" autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <div className="flex rounded-md border border-border" role="group" aria-label="View mode">
            <button type="button" onClick={() => setViewMode("labels")} aria-pressed={viewMode === "labels"}
              className={`rounded-l-md px-3 py-2 text-sm font-medium transition-colors ${viewMode === "labels" ? "bg-orange-500/10 text-orange-500" : "text-muted-foreground hover:text-foreground"}`}>
              Labels
            </button>
            <button type="button" onClick={() => setViewMode("table")} aria-pressed={viewMode === "table"}
              className={`rounded-r-md border-l border-border px-3 py-2 text-sm font-medium transition-colors ${viewMode === "table" ? "bg-orange-500/10 text-orange-500" : "text-muted-foreground hover:text-foreground"}`}>
              Table
            </button>
          </div>
          <button type="button" onClick={() => setShowGroups((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${showGroups ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Groups
          </button>
          {viewMode === "table" && selected.size > 0 && (
            <button onClick={requestBulkDelete} className="rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5">
              Delete {selected.size} selected
            </button>
          )}
        </div>

        {/* Sort + page-size bar — always visible */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Sort:</span>
            {(["name", "date", "intake"] as const).map((field) => {
              const labels = { name: "Name", date: "Date Added", intake: "Use Count" };
              const active = sortField === field;
              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => handleSort(field)}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-orange-500 text-white"
                      : "border border-border text-muted-foreground hover:border-orange-500 hover:text-orange-500"
                  }`}
                >
                  {labels[field]}
                  {active && <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show:</span>
            {([100, 200, 300] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPageSize(size)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  pageSize === size
                    ? "bg-orange-500 text-white"
                    : "border border-border text-muted-foreground hover:border-orange-500 hover:text-orange-500"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {viewMode === "labels" ? (
          <SkillLabelGrid skills={skills} isLoading={isLoading} isError={isError} search={searchInput} pageSize={pageSize} onDelete={requestDeleteOne} />
        ) : (
          <SkillTableView
            skills={skills} isLoading={isLoading} isError={isError}
            searchInput={searchInput} categoryFilter={categoryFilter} selected={selected}
            allSelected={allSelected} someSelected={someSelected}
            sortField={sortField} sortDir={sortDir} pageSize={pageSize} onSort={handleSort}
            onToggleAll={toggleAll} onToggleOne={toggleOne} onDelete={requestDeleteOne}
          />
        )}

        {/* Pagination footer */}
        {totalSkills > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {`Showing ${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, totalSkills)} of ${totalSkills} skill${totalSkills === 1 ? "" : "s"}`}
              {categoryFilter && ` in ${categoryFilter}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded border border-border px-2 py-1 font-medium transition-colors hover:border-orange-500 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="px-2 tabular-nums">{safePage + 1} / {totalPages}</span>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="rounded border border-border px-2 py-1 font-medium transition-colors hover:border-orange-500 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {confirmDelete && (
          <SkillConfirmDialog message={confirmDelete.label} onConfirm={executeConfirmedDelete}
            onCancel={() => setConfirmDelete(null)} isLoading={isDeleting} />
        )}
      </div>

      {/* ── Groups side panel ── */}
      {showGroups && (
        <div className="w-72 shrink-0">
          <SkillGroupsPanel
            skills={allSkills}
            onClose={() => setShowGroups(false)}
            onMigrate={(from, to) => recategorize.mutate({ from, to })}
            onBulkDelete={(ids) => setConfirmDelete({ ids, label: `Delete ${ids.length} skill${ids.length !== 1 ? "s" : ""}? This cannot be undone.` })}
            isMigrating={recategorize.isPending}
          />
        </div>
      )}
    </div>
  );
}
