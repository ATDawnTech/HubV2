import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Role } from "../types/role.types";

interface Props {
  role: Role;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteRoleModal({ role, onConfirm, onCancel, isDeleting }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5">
          <h3 className="text-lg font-semibold text-foreground">Delete Role</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{role.name}</span>?
            This action cannot be undone. Any employees assigned to this role will lose its permissions.
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete Role"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
