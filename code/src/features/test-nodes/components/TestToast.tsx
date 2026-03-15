import { useEffect, useState } from "react";

export interface Toast {
  id: string;
  type: "info" | "success" | "warning" | "error" | "email" | "notification";
  title: string;
  body: string;
  timestamp: Date;
}

interface TestToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const TYPE_STYLES: Record<Toast["type"], { bg: string; border: string; icon: string }> = {
  info: { bg: "bg-blue-50 dark:bg-blue-950", border: "border-blue-300 dark:border-blue-700", icon: "i" },
  success: { bg: "bg-green-50 dark:bg-green-950", border: "border-green-300 dark:border-green-700", icon: "✓" },
  warning: { bg: "bg-amber-50 dark:bg-amber-950", border: "border-amber-300 dark:border-amber-700", icon: "!" },
  error: { bg: "bg-red-50 dark:bg-red-950", border: "border-red-300 dark:border-red-700", icon: "✕" },
  email: { bg: "bg-indigo-50 dark:bg-indigo-950", border: "border-indigo-300 dark:border-indigo-700", icon: "@" },
  notification: { bg: "bg-orange-50 dark:bg-orange-950", border: "border-orange-300 dark:border-orange-700", icon: "N" },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }): JSX.Element {
  const [exiting, setExiting] = useState(false);
  const style = TYPE_STYLES[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 4500);
    const removeTimer = setTimeout(onDismiss, 5000);
    return () => { clearTimeout(timer); clearTimeout(removeTimer); };
  }, [onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex w-80 gap-3 rounded-lg border ${style.border} ${style.bg} p-3 shadow-lg transition-all duration-300 ${exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}
    >
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold dark:bg-black/30">
        {style.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
          <button onClick={onDismiss} className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-3">{toast.body}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          {toast.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

export function TestToastContainer({ toasts, onDismiss }: TestToastContainerProps): JSX.Element {
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}
