import { useEmployeeFilters } from "../hooks/useEmployeeFilters";
import { EmployeeFilterModal } from "./EmployeeFilterModal";

type FiltersHandle = ReturnType<typeof useEmployeeFilters>;

interface Props {
  filters: FiltersHandle;
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  onResetPage: () => void;
}

export function EmployeeSearchBar({ filters, filterOpen, setFilterOpen, searchInput, setSearchInput, onResetPage }: Props) {
  return (
    <div className="mb-4 flex gap-2">
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            filters.filterCount > 0
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-border text-muted-foreground hover:border-orange-500 hover:text-orange-500"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" /></svg>
          <span>Filters</span>
          {filters.filterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-orange-500">
              {filters.filterCount}
            </span>
          )}
        </button>
        <EmployeeFilterModal
          isOpen={filterOpen}
          activeStatuses={filters.activeStatuses}
          onStatusToggle={(s) => { filters.toggleStatus(s); onResetPage(); }}
          selectedDepts={filters.selectedDepts}
          onDeptToggle={(v) => { filters.toggleDept(v); onResetPage(); }}
          selectedLocations={filters.selectedLocations}
          onLocationToggle={(v) => { filters.toggleLocation(v); onResetPage(); }}
          selectedHireTypes={filters.selectedHireTypes}
          onHireTypeToggle={(v) => { filters.toggleHireType(v); onResetPage(); }}
          selectedWorkModes={filters.selectedWorkModes}
          onWorkModeToggle={(v) => { filters.toggleWorkMode(v); onResetPage(); }}
          selectedRoles={filters.selectedRoles}
          onRoleToggle={(v) => { filters.toggleRole(v); onResetPage(); }}
          jobTitleInput={filters.jobTitleInput}
          onJobTitleChange={(v) => { filters.setJobTitleInput(v); onResetPage(); }}
          hireDateFrom={filters.hireDateFrom}
          onHireDateFromChange={(v) => { filters.setHireDateFrom(v); onResetPage(); }}
          hireDateTo={filters.hireDateTo}
          onHireDateToChange={(v) => { filters.setHireDateTo(v); onResetPage(); }}
          onClearAll={() => { filters.clearAll(); onResetPage(); }}
          onClose={() => setFilterOpen(false)}
        />
      </div>
      <input
        type="text"
        placeholder="Search by name, email, title, department…"
        value={searchInput}
        onChange={(e) => { setSearchInput(e.target.value); onResetPage(); }}
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
