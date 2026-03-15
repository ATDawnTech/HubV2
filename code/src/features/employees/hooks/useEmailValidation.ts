import { useEffect, useState } from "react";
import type { FieldErrors, UseFormSetValue } from "react-hook-form";
import type { CreateEmployeeFormValues } from "../schemas/employee.schemas";
import { useCheckEmail } from "./useCheckEmail";

function generateWorkEmail(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first || !last) return "";
  const clean = (n: string) => n.replace(/\s+/g, "").replace(/[^a-zA-Z]/g, "");
  const cap = (n: string) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  return `${cap(clean(first))}.${cap(clean(last))}@AtDawnTech.com`;
}

/**
 * Manages email auto-generation and availability check state.
 * P3: extracted from CreateEmployeeModal.
 */
export function useEmailValidation(
  firstName: string | undefined,
  lastName: string | undefined,
  errors: FieldErrors<CreateEmployeeFormValues>,
  setValue: UseFormSetValue<CreateEmployeeFormValues>,
) {
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailTakenError, setEmailTakenError] = useState<string | null>(null);
  const { checkEmail, isChecking: checkingEmail } = useCheckEmail();

  // Auto-generate email from name whenever first/last name changes and user hasn't manually edited
  useEffect(() => {
    if (emailTouched) return;
    const generated = generateWorkEmail(firstName ?? "", lastName ?? "");
    setValue("work_email", generated, { shouldValidate: false, shouldDirty: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, emailTouched]);

  async function handleEmailBlur(email: string) {
    if (!email || errors.work_email) return;
    if (!email.toLowerCase().endsWith("@atdawntech.com")) return;
    const available = await checkEmail(email);
    if (available === false) setEmailTakenError("This email is already in use.");
    else setEmailTakenError(null);
  }

  return {
    emailTakenError,
    checkingEmail,
    markEmailTouched: () => setEmailTouched(true),
    clearEmailTakenError: () => setEmailTakenError(null),
    /** Resets touched state and clears taken-error — call when discarding draft. */
    resetEmail: () => { setEmailTouched(false); setEmailTakenError(null); },
    handleEmailBlur,
  };
}
