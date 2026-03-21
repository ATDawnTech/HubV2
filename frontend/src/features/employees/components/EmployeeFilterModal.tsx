import { useEffect, useRef } from "react";
import { EmployeeFilterBody } from "./EmployeeFilterBody";

interface Props {
  isOpen: boolean;
  activeStatuses: string[];
  onStatusToggle: (s: string) => void;
  selectedDepts: string[];
  onDeptToggle: (v: string) => void;
  selectedLocations: string[];
  onLocationToggle: (v: string) => void;
  selectedHireTypes: string[];
  onHireTypeToggle: (v: string) => void;
  selectedWorkModes: string[];
  onWorkModeToggle: (v: string) => void;
  selectedRoles: string[];
  onRoleToggle: (v: string) => void;
  jobTitleInput: string;
  onJobTitleChange: (v: string) => void;
  hireDateFrom: string;
  onHireDateFromChange: (v: string) => void;
  hireDateTo: string;
  onHireDateToChange: (v: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function EmployeeFilterModal({
  isOpen,
  activeStatuses, onStatusToggle,
  selectedDepts, onDeptToggle,
  selectedLocations, onLocationToggle,
  selectedHireTypes, onHireTypeToggle,
  selectedWorkModes, onWorkModeToggle,
  selectedRoles, onRoleToggle,
  jobTitleInput, onJobTitleChange,
  hireDateFrom, onHireDateFromChange,
  hireDateTo, onHireDateToChange,
  onClearAll, onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    const id = setTimeout(() => document.addEventListener("mousedown", onMouseDown), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", onMouseDown); };
  }, [isOpen, onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-panel-title"
      className={`absolute left-0 top-full z-50 mt-1 flex w-96 flex-col rounded-xl border border-border bg-card shadow-2xl ${isOpen ? "" : "hidden"}`}
      style={{ maxHeight: "min(520px, calc(100vh - 180px))" }}
    >
      <div className="flex flex-shrink-0 items-center justify-between rounded-t-xl bg-orange-500 px-5 py-3">
        <h2 id="filter-panel-title" className="text-sm font-semibold text-white">Filters</h2>
        <button onClick={onClose} aria-label="Close" className="text-orange-200 hover:text-white">✕</button>
      </div>

      <EmployeeFilterBody
        activeStatuses={activeStatuses} onStatusToggle={onStatusToggle}
        selectedDepts={selectedDepts} onDeptToggle={onDeptToggle}
        selectedLocations={selectedLocations} onLocationToggle={onLocationToggle}
        selectedHireTypes={selectedHireTypes} onHireTypeToggle={onHireTypeToggle}
        selectedWorkModes={selectedWorkModes} onWorkModeToggle={onWorkModeToggle}
        selectedRoles={selectedRoles} onRoleToggle={onRoleToggle}
        jobTitleInput={jobTitleInput} onJobTitleChange={onJobTitleChange}
        hireDateFrom={hireDateFrom} onHireDateFromChange={onHireDateFromChange}
        hireDateTo={hireDateTo} onHireDateToChange={onHireDateToChange}
      />

      <div className="flex flex-shrink-0 items-center justify-between border-t border-border px-5 py-3">
        <button onClick={onClearAll} className="text-sm font-medium text-muted-foreground hover:text-destructive">
          Clear All
        </button>
        <button onClick={onClose} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
          Done
        </button>
      </div>
    </div>
  );
}
