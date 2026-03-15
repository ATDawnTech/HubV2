import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/cn";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useDropdownOptions } from "@/features/admin-settings";
import {
  updateEmployeeSchema,
  type UpdateEmployeeFormValues,
} from "../schemas/employee.schemas";
import type { Employee } from "../types/employee.types";
import { Field, inputClass, formatLabel } from "./FormField";

interface EditProps {
  mode: "edit";
  onSubmit: (data: UpdateEmployeeFormValues) => void;
  isSubmitting: boolean;
  defaultValues: Partial<Employee>;
}

type DropdownOpt = { id: string; value: string };
function withFallback(opts: DropdownOpt[] | undefined, current: string | null | undefined): DropdownOpt[] {
  if (!opts) return [];
  if (!current || opts.some((o) => o.value === current)) return opts;
  return [...opts, { id: `__stale_${current}`, value: current }];
}

export function EmployeeForm({ onSubmit, isSubmitting, defaultValues }: EditProps): JSX.Element {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateEmployeeFormValues>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      first_name: defaultValues.first_name ?? "",
      last_name: defaultValues.last_name ?? "",
      job_title: defaultValues.job_title ?? "",
      department: defaultValues.department ?? "",
      location: defaultValues.location ?? "",
      hire_type: defaultValues.hire_type ?? "",
      work_mode: defaultValues.work_mode ?? "",
      hire_date: defaultValues.hire_date ?? "",
      manager_id: defaultValues.manager_id ?? "",
    },
  });

  // Dynamic dropdowns from Epic 3.1
  const hireTypes = useDropdownOptions("global", "hire_type");
  const workModes = useDropdownOptions("global", "work_mode");
  const departments = useDropdownOptions("employees", "department");
  const locations = useDropdownOptions("global", "location");

  // Stale detection — compute reason ("Disabled" if option exists but inactive, "Removed" if gone entirely)
  function getStaleReason(value: string | null | undefined, data: typeof departments.data): string | undefined {
    if (!value || !data || data.length === 0) return undefined;
    const active = data.filter((o) => o.is_active);
    if (active.length === 0) return undefined; // category not configured yet
    if (active.some((o) => o.value === value)) return undefined;
    return data.some((o) => o.value === value) ? "Disabled" : "Removed";
  }
  const staleDept = getStaleReason(defaultValues.department, departments.data);
  const staleLocation = getStaleReason(defaultValues.location, locations.data);
  const staleHireType = getStaleReason(defaultValues.hire_type, hireTypes.data);
  const staleWorkMode = getStaleReason(defaultValues.work_mode, workModes.data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" id="edit-first_name" error={errors.first_name?.message}>
          <input
            id="edit-first_name"
            {...register("first_name")}
            aria-invalid={!!errors.first_name}
            aria-describedby={errors.first_name ? "edit-first_name-error" : undefined}
            className={cn(inputClass)}
          />
        </Field>
        <Field label="Last Name" id="edit-last_name" error={errors.last_name?.message}>
          <input
            id="edit-last_name"
            {...register("last_name")}
            aria-invalid={!!errors.last_name}
            aria-describedby={errors.last_name ? "edit-last_name-error" : undefined}
            className={cn(inputClass)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Job Title" id="edit-job_title" error={errors.job_title?.message}>
          <input
            id="edit-job_title"
            {...register("job_title")}
            aria-invalid={!!errors.job_title}
            aria-describedby={errors.job_title ? "edit-job_title-error" : undefined}
            className={cn(inputClass)}
          />
        </Field>
        <Field label="Hire Date" id="edit-hire_date" error={errors.hire_date?.message}>
          <input
            id="edit-hire_date"
            {...register("hire_date")}
            type="date"
            aria-invalid={!!errors.hire_date}
            aria-describedby={errors.hire_date ? "edit-hire_date-error" : undefined}
            className={cn(inputClass)}
          />
        </Field>
      </div>

      {/* Department & Location — dynamic from Epic 3.1 */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Department" id="edit-department" error={errors.department?.message} staleReason={staleDept}>
          {departments.data && departments.data.length > 0 ? (
            <CustomSelect
              value={watch("department") ?? ""}
              onChange={(v) => setValue("department", v, { shouldValidate: true })}
              options={withFallback(departments.data, defaultValues.department).map((o) => ({ value: o.value, label: formatLabel(o.value) }))}
              hasError={!!errors.department}
            />
          ) : (
            <input
              id="edit-department"
              {...register("department")}
              aria-invalid={!!errors.department}
              aria-describedby={errors.department ? "edit-department-error" : undefined}
              className={cn(inputClass)}
            />
          )}
        </Field>
        <Field label="Location" id="edit-location" error={errors.location?.message} staleReason={staleLocation}>
          {locations.data && locations.data.length > 0 ? (
            <CustomSelect
              value={watch("location") ?? ""}
              onChange={(v) => setValue("location", v, { shouldValidate: true })}
              options={withFallback(locations.data, defaultValues.location).map((o) => ({ value: o.value, label: formatLabel(o.value) }))}
              hasError={!!errors.location}
            />
          ) : (
            <input
              id="edit-location"
              {...register("location")}
              aria-invalid={!!errors.location}
              aria-describedby={errors.location ? "edit-location-error" : undefined}
              className={cn(inputClass)}
            />
          )}
        </Field>
      </div>

      {/* Hire Type & Work Mode — dynamic from Epic 3.1 */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Hire Type" id="edit-hire_type" error={errors.hire_type?.message} staleReason={staleHireType}>
          <CustomSelect
            value={watch("hire_type") ?? ""}
            onChange={(v) => setValue("hire_type", v, { shouldValidate: true })}
            options={withFallback(hireTypes.data, defaultValues.hire_type).map((o) => ({ value: o.value, label: formatLabel(o.value) }))}
            hasError={!!errors.hire_type}
          />
        </Field>
        <Field label="Work Mode" id="edit-work_mode" error={errors.work_mode?.message} staleReason={staleWorkMode}>
          <CustomSelect
            value={watch("work_mode") ?? ""}
            onChange={(v) => setValue("work_mode", v, { shouldValidate: true })}
            options={withFallback(workModes.data, defaultValues.work_mode).map((o) => ({ value: o.value, label: formatLabel(o.value) }))}
            hasError={!!errors.work_mode}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
