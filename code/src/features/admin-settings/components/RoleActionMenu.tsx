import { useState, useRef, useEffect } from "react";
import { DeleteRoleModal } from "./DeleteRoleModal";
import type { Role } from "../types/role.types";

interface Props {
  role: Role;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  canManage: boolean;
}

export function RoleActionMenu({ role, onEdit, onDelete, isDeleting, canManage }: Props) {
  if (!canManage || role.is_system) return null;
  const [open, setOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      <div ref={menuRef} className="relative flex items-center justify-end">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Actions"
        >
          ⋮
        </button>

        {open && (
          <div className="absolute right-0 bottom-full mb-1 z-10 min-w-[160px] rounded-md border border-border bg-card shadow-lg">
            <button
              onClick={() => { setOpen(false); onEdit(); }}
              className="block w-full px-4 py-2 text-left text-sm text-card-foreground hover:bg-muted"
            >
              Edit
            </button>
            {!role.is_system && (
              <>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => { setOpen(false); setShowDeleteModal(true); }}
                  className="block w-full px-4 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <DeleteRoleModal
          role={role}
          onConfirm={() => { setShowDeleteModal(false); onDelete(); }}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
