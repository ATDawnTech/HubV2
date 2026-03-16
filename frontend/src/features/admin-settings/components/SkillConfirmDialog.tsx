interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SkillConfirmDialog({ message, onConfirm, onCancel, isLoading }: Props): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl whitespace-normal">
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold text-card-foreground">Confirm Delete</h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
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
            disabled={isLoading}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isLoading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
