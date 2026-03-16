import { useState } from "react";
import { employeeService } from "@/services/employee.service";

/**
 * R4-compliant wrapper around employeeService.checkEmail().
 * Components must not call the service directly.
 */
export function useCheckEmail() {
  const [isChecking, setIsChecking] = useState(false);

  /** Returns true if available, false if taken, null on network error. */
  async function checkEmail(email: string): Promise<boolean | null> {
    setIsChecking(true);
    try {
      const { available } = await employeeService.checkEmail(email);
      return available;
    } catch {
      return null;
    } finally {
      setIsChecking(false);
    }
  }

  return { checkEmail, isChecking };
}
