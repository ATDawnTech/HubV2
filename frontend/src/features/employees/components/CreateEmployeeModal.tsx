import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/cn";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useDropdownOptions } from "@/features/admin-settings";
import { createEmployeeSchema, type CreateEmployeeFormValues } from "../schemas/employee.schemas";
import { useDraftPersistence } from "../hooks/useDraftPersistence";
import { useEmailValidation } from "../hooks/useEmailValidation";
import { useAttachmentUpload } from "../hooks/useAttachmentUpload";
import { AttachmentsField } from "./AttachmentsField";
import { ManagerPickerField } from "./ManagerPickerField";
import { Field, inputClass, formatLabel } from "./FormField";

interface Props {
  onSubmit: (data: CreateEmployeeFormValues) => void;
  onClose: () => void;
  onDismiss: () => void;
  isSubmitting: boolean;
  error?: string | undefined;
}

export function CreateEmployeeModal({ onSubmit, onClose, onDismiss, isSubmitting, error }: Props): JSX.Element {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateEmployeeFormValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { status: "active" },
  });

  const firstName = watch("first_name");
  const lastName = watch("last_name");
  const email = useEmailValidation(firstName, lastName, errors, setValue);
  const draft = useDraftPersistence({ setValue, watch, onEmailInDraft: email.markEmailTouched });
  const attachments = useAttachmentUpload();

  const hireTypes = useDropdownOptions("global", "hire_type");
  const workModes = useDropdownOptions("global", "work_mode");
  const departments = useDropdownOptions("employees", "department");
  const locations = useDropdownOptions("global", "location");

  // Escape key → dismiss (preserves draft for reopen)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") onDismiss(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() { draft.clearDraft(); onClose(); }

  function handleDiscard() {
    draft.clearDraft();
    const fields = ["first_name", "last_name", "work_email", "department",
      "location", "hire_type", "work_mode", "job_title", "manager_id", "hire_date"] as (keyof CreateEmployeeFormValues)[];
    fields.forEach((k) => setValue(k, "" as string, { shouldValidate: false, shouldDirty: false }));
    email.resetEmail();
    attachments.clearFiles();
  }

  function handleFormSubmit(data: CreateEmployeeFormValues) { draft.clearDraft(); onSubmit(data); }

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="create-employee-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onDismiss}
    >
      <div className="w-full max-w-3xl rounded-xl bg-card shadow-xl" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-orange-500 px-6 py-5">
          <div>
            <h2 id="create-employee-title" className="text-lg font-semibold text-white">Add Employee</h2>
            {draft.hasDraft && (
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-xs text-orange-200">Draft restored — your previous entries have been saved.</p>
                <button type="button" onClick={handleDiscard} className="rounded px-1.5 py-0.5 text-[10px] font-medium text-orange-200 ring-1 ring-orange-300/50 hover:bg-orange-400/20 hover:text-white">
                  Discard
                </button>
              </div>
            )}
          </div>
          <button onClick={handleClose} aria-label="Close" className="text-orange-200 hover:text-white">✕</button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 px-6 py-5" noValidate>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *" id="create-first_name" error={errors.first_name?.message}>
                <input id="create-first_name" {...register("first_name")} aria-invalid={!!errors.first_name} aria-describedby={errors.first_name ? "create-first_name-error" : undefined} className={cn(inputClass)} />
              </Field>
              <Field label="Last Name *" id="create-last_name" error={errors.last_name?.message}>
                <input id="create-last_name" {...register("last_name")} aria-invalid={!!errors.last_name} aria-describedby={errors.last_name ? "create-last_name-error" : undefined} className={cn(inputClass)} />
              </Field>
            </div>

            {/* Work Email */}
            <Field label="Work Email" id="create-work_email" error={errors.work_email?.message ?? email.emailTakenError ?? undefined}>
              <input
                id="create-work_email" {...register("work_email")} type="email"
                aria-invalid={!!(errors.work_email || email.emailTakenError)}
                aria-describedby={errors.work_email || email.emailTakenError ? "create-work_email-error" : undefined}
                className={cn(inputClass)}
                onFocus={email.markEmailTouched}
                onBlur={(e) => { email.clearEmailTakenError(); void email.handleEmailBlur(e.target.value); }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {email.checkingEmail ? "Checking availability…" : "Auto-generated from name — edit if needed."}
              </p>
            </Field>

            {/* Hire Type & Work Mode */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hire Type *" id="create-hire_type" error={errors.hire_type?.message}>
                <CustomSelect value={watch("hire_type") ?? ""} onChange={(v) => setValue("hire_type", v, { shouldValidate: true })} options={(hireTypes.data ?? []).map((o) => ({ value: o.value, label: formatLabel(o.value) }))} hasError={!!errors.hire_type} />
              </Field>
              <Field label="Work Mode *" id="create-work_mode" error={errors.work_mode?.message}>
                <CustomSelect value={watch("work_mode") ?? ""} onChange={(v) => setValue("work_mode", v, { shouldValidate: true })} options={(workModes.data ?? []).map((o) => ({ value: o.value, label: formatLabel(o.value) }))} hasError={!!errors.work_mode} />
              </Field>
            </div>

            {/* Department & Location */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department *" id="create-department" error={errors.department?.message}>
                {departments.data?.length ? (
                  <CustomSelect value={watch("department") ?? ""} onChange={(v) => setValue("department", v, { shouldValidate: true })} options={departments.data.map((o) => ({ value: o.value, label: formatLabel(o.value) }))} hasError={!!errors.department} />
                ) : (
                  <input id="create-department" {...register("department")} placeholder="e.g. Engineering" aria-invalid={!!errors.department} aria-describedby={errors.department ? "create-department-error" : undefined} className={cn(inputClass)} />
                )}
              </Field>
              <Field label="Location *" id="create-location" error={errors.location?.message}>
                {locations.data?.length ? (
                  <CustomSelect value={watch("location") ?? ""} onChange={(v) => setValue("location", v, { shouldValidate: true })} options={locations.data.map((o) => ({ value: o.value, label: formatLabel(o.value) }))} hasError={!!errors.location} />
                ) : (
                  <input id="create-location" {...register("location")} placeholder="e.g. New York" aria-invalid={!!errors.location} aria-describedby={errors.location ? "create-location-error" : undefined} className={cn(inputClass)} />
                )}
              </Field>
            </div>

            {/* Job Title & Hire Date */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Job Title" id="create-job_title" error={errors.job_title?.message}>
                <input id="create-job_title" {...register("job_title")} aria-invalid={!!errors.job_title} aria-describedby={errors.job_title ? "create-job_title-error" : undefined} className={cn(inputClass)} />
              </Field>
              <Field label="Hire Date" id="create-hire_date" error={errors.hire_date?.message}>
                <input id="create-hire_date" {...register("hire_date")} type="date" aria-invalid={!!errors.hire_date} aria-describedby={errors.hire_date ? "create-hire_date-error" : undefined} className={cn(inputClass)} />
              </Field>
            </div>

            {/* Manager — 2.7: only active/new_onboard employees shown */}
            <Field label="Manager" id="create-manager_id">
              <ManagerPickerField value={watch("manager_id") ?? ""} onSelect={(id) => setValue("manager_id", id)} onClear={() => setValue("manager_id", "")} />
              <p className="mt-1 text-xs text-muted-foreground">Only active employees are shown. Archiving or archived employees are excluded.</p>
            </Field>

            {/* Project Tags — Epic 7 placeholder */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Project Tags</label>
              <div className="flex items-center gap-2.5 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5">
                <span className="text-xs text-muted-foreground/60">⬡</span>
                <span className="text-xs text-muted-foreground">Available when Epic 7 (Projects) is connected</span>
              </div>
            </div>

            <AttachmentsField {...attachments} />

            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button type="button" onClick={handleClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary">Cancel</button>
              <button type="submit" disabled={isSubmitting || !!email.emailTakenError || email.checkingEmail} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting ? "Creating…" : "Create Employee"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
