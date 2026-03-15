import type { JSX } from "react";

interface CanvasTopBarProps {
  templateName: string;
  hasChanges: boolean;
  cannotSave: boolean;
  savedJustNow: boolean;
  onNameChange: (name: string) => void;
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function CanvasTopBar({
  templateName,
  hasChanges,
  cannotSave,
  savedJustNow,
  onNameChange,
  onBack,
  onUndo,
  onRedo,
  onDiscard,
  onSave,
}: CanvasTopBarProps): JSX.Element {
  const saveDisabled = cannotSave || !hasChanges;

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </button>
        <input
          value={templateName}
          onChange={(e) => onNameChange(e.target.value)}
          className="border-none bg-transparent text-sm font-semibold text-foreground focus:outline-none focus:ring-0"
          placeholder="Template name…"
        />
        {hasChanges && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            Unsaved
          </span>
        )}
        {savedJustNow && !hasChanges && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            ✓ Saved
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={onRedo}
          className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
        <div className="mx-1 h-5 w-px bg-border" />
        <button
          onClick={onDiscard}
          disabled={!hasChanges}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          Discard
        </button>
        <button
          onClick={onSave}
          disabled={saveDisabled}
          title={
            cannotSave
              ? "Connect all nodes before saving"
              : !hasChanges
                ? "No unsaved changes"
                : undefined
          }
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
