import { useEffect, useState } from "react";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { CreateEmployeeFormValues } from "../schemas/employee.schemas";

const DRAFT_KEY = "create-employee-draft";

interface Options {
  setValue: UseFormSetValue<CreateEmployeeFormValues>;
  watch: UseFormWatch<CreateEmployeeFormValues>;
  /** Called after mount if the restored draft contains a work_email value. */
  onEmailInDraft: () => void;
}

/**
 * Persists form draft to localStorage. Restores on mount; cleared on explicit close/submit.
 * Backdrop/Escape should NOT call clearDraft — that preserves the draft for reopen.
 *
 * P3: extracted from CreateEmployeeModal.
 */
export function useDraftPersistence({ setValue, watch, onEmailInDraft }: Options) {
  const [hasDraft, setHasDraft] = useState(false);

  // Restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved) as Record<string, unknown>;
      const hasContent = !!(draft.first_name || draft.last_name || draft.department || draft.hire_type);
      setHasDraft(hasContent);
      (Object.entries(draft) as [keyof CreateEmployeeFormValues, unknown][]).forEach(([k, v]) => {
        if (v !== undefined && v !== "") {
          setValue(k, v as string, { shouldValidate: false, shouldDirty: false });
        }
      });
      if (draft.work_email) onEmailInDraft();
    } catch { /* ignore corrupt data */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on every field change
  useEffect(() => {
    const { unsubscribe } = watch((values) => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(values)); } catch { /* ignore */ }
    });
    return unsubscribe;
  }, [watch]);

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  }

  return { hasDraft, clearDraft };
}
