import type { TestNodeType } from "../types";

interface ToolbarItem {
  type: TestNodeType;
  label: string;
  color: string;
}

const TOOLBAR_ITEMS: ToolbarItem[] = [
  { type: "taskNode", label: "Task", color: "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950" },
  { type: "waitForNode", label: "Wait For", color: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950" },
  { type: "ifElseNode", label: "If / Else", color: "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-950" },
  { type: "notificationNode", label: "Notification", color: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950" },
];

interface NodeToolbarProps {
  onZoomToStart: () => void;
  onZoomToEnd: () => void;
}

export function NodeToolbar({ onZoomToStart, onZoomToEnd }: NodeToolbarProps): JSX.Element {
  function onDragStart(e: React.DragEvent, nodeType: TestNodeType): void {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur">
      {/* Zoom-to shortcuts for Start/End */}
      <button
        type="button"
        onClick={onZoomToStart}
        className="rounded-md border-2 border-green-500 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600 transition-colors hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
      >
        ⇢ Start
      </button>
      <button
        type="button"
        onClick={onZoomToEnd}
        className="rounded-md border-2 border-red-500 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900"
      >
        ⇢ End
      </button>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Draggable node types */}
      {TOOLBAR_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
          className={`cursor-grab rounded-md border-2 px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80 active:cursor-grabbing ${item.color}`}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
