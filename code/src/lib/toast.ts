/**
 * Centralised toast helpers — wraps sonner so call sites stay simple
 * and the library can be swapped without touching feature code.
 *
 * Usage:
 *   import { toast } from "@/lib/toast";
 *   toast.success("Employee created.");
 *   toast.error("Failed to create employee.");
 */
import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string) =>
    sonnerToast.success(message, { duration: 4000 }),

  error: (message: string) =>
    sonnerToast.error(message, { duration: 4000 }),

  info: (message: string) =>
    sonnerToast(message, { duration: 4000 }),
};
