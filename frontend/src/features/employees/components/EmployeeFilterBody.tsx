import { useDropdownOptions } from "@/features/admin-settings/hooks/useDropdownOptions";
import { CheckboxGroup, FilterSection, STATUS_OPTIONS, formatLabel } from "./filterHelpers";

interface Props {
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
  jobTitleInput: string;
  onJobTitleChange: (v: string) => void;
  hireDateFrom: string;
  onHireDateFromChange: (v: string) => void;
  hireDateTo: string;
  onHireDateToChange: (v: string) => void;
}

export function EmployeeFilterBody({
  activeStatuses, onStatusToggle,
  selectedDepts, onDeptToggle,
  selectedLocations, onLocationToggle,
  selectedHireTypes, onHireTypeToggle,
  selectedWorkModes, onWorkModeToggle,
  jobTitleInput, onJobTitleChange,
  hireDateFrom, onHireDateFromChange,
  hireDateTo, onHireDateToChange,
}: Props) {
  const deptQuery = useDropdownOptions("employees", "department");
  const locationQuery = useDropdownOptions("global", "location");
  const hireTypeQuery = useDropdownOptions("global", "hire_type");
  const workModeQuery = useDropdownOptions("global", "work_mode");

  const deptOptions = (deptQuery.data ?? []).filter((o) => o.is_active).map((o) => ({ value: o.value, label: formatLabel(o.value) }));
  const locationOptions = (locationQuery.data ?? []).filter((o) => o.is_active).map((o) => ({ value: o.value, label: formatLabel(o.value) }));
  const hireTypeOptions = (hireTypeQuery.data ?? []).filter((o) => o.is_active).map((o) => ({ value: o.value, label: formatLabel(o.value) }));
  const workModeOptions = (workModeQuery.data ?? []).filter((o) => o.is_active).map((o) => ({ value: o.value, label: formatLabel(o.value) }));

  const textInputClass = (active: boolean) =>
    `w-full rounded-md border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors ${
      active
        ? "border-orange-500 bg-orange-500/5 focus:ring-orange-500"
        : "border-input bg-background focus:border-ring focus:ring-ring"
    }`;

  return (
    <div className="flex-1 divide-y divide-border overflow-y-auto">
      <div className="px-5 py-3">
        <FilterSection label="Status" badge={activeStatuses.length} defaultOpen={true}>
          <CheckboxGroup options={STATUS_OPTIONS} selected={activeStatuses} onToggle={onStatusToggle} />
        </FilterSection>
      </div>
      <div className="px-5 py-3">
        <FilterSection label="Department" badge={selectedDepts.length} defaultOpen={selectedDepts.length > 0}>
          <CheckboxGroup options={deptOptions} selected={selectedDepts} onToggle={onDeptToggle} loading={deptQuery.isLoading} />
        </FilterSection>
      </div>
      <div className="px-5 py-3">
        <FilterSection label="Location" badge={selectedLocations.length} defaultOpen={selectedLocations.length > 0}>
          <CheckboxGroup options={locationOptions} selected={selectedLocations} onToggle={onLocationToggle} loading={locationQuery.isLoading} />
        </FilterSection>
      </div>
      <div className="px-5 py-3">
        <FilterSection label="Hire Type" badge={selectedHireTypes.length} defaultOpen={selectedHireTypes.length > 0}>
          <CheckboxGroup options={hireTypeOptions} selected={selectedHireTypes} onToggle={onHireTypeToggle} loading={hireTypeQuery.isLoading} />
        </FilterSection>
      </div>
      <div className="px-5 py-3">
        <FilterSection label="Work Model" badge={selectedWorkModes.length} defaultOpen={selectedWorkModes.length > 0}>
          <CheckboxGroup options={workModeOptions} selected={selectedWorkModes} onToggle={onWorkModeToggle} loading={workModeQuery.isLoading} />
        </FilterSection>
      </div>
      <div className="px-5 py-3">
        <FilterSection label="Job Title" badge={jobTitleInput ? 1 : 0} defaultOpen={Boolean(jobTitleInput)}>
          <input
            type="text"
            placeholder="e.g. Software Engineer"
            value={jobTitleInput}
            onChange={(e) => onJobTitleChange(e.target.value)}
            className={textInputClass(Boolean(jobTitleInput))}
          />
        </FilterSection>
      </div>
      <div className="px-5 py-3">
        <FilterSection label="Hire Date" badge={(hireDateFrom ? 1 : 0) + (hireDateTo ? 1 : 0)} defaultOpen={Boolean(hireDateFrom || hireDateTo)}>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={hireDateFrom}
              onChange={(e) => {
                const val = e.target.value;
                if (val && hireDateTo && val > hireDateTo) {
                  onHireDateFromChange(hireDateTo);
                  onHireDateToChange(val);
                } else {
                  onHireDateFromChange(val);
                }
              }}
              className={textInputClass(Boolean(hireDateFrom))}
            />
            <span className="flex-shrink-0 text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={hireDateTo}
              onChange={(e) => {
                const val = e.target.value;
                if (val && hireDateFrom && val < hireDateFrom) {
                  onHireDateToChange(hireDateFrom);
                  onHireDateFromChange(val);
                } else {
                  onHireDateToChange(val);
                }
              }}
              className={textInputClass(Boolean(hireDateTo))}
            />
          </div>
        </FilterSection>
      </div>
    </div>
  );
}
