import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useNotifications } from "@/context/NotificationContext";
import type { InAppNotification } from "@/context/NotificationContext";

// ---------------------------------------------------------------------------
// Module badge colours
// ---------------------------------------------------------------------------

const MODULE_COLORS: Record<string, string> = {
  employees: "bg-blue-100 text-blue-700",
  assets: "bg-amber-100 text-amber-700",
  onboarding: "bg-green-100 text-green-700",
  intake: "bg-purple-100 text-purple-700",
  projects: "bg-indigo-100 text-indigo-700",
  timesheets: "bg-orange-100 text-orange-700",
  audit: "bg-red-100 text-red-700",
  system: "bg-slate-100 text-slate-600",
};

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Notification item
// ---------------------------------------------------------------------------

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: InAppNotification;
  onDismiss: (id: string) => void;
}) {
  const moduleColor = MODULE_COLORS[notification.module] ?? "bg-muted text-muted-foreground";

  return (
    <li className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="mb-1">
          <span
            className={cn(
              "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              moduleColor,
            )}
          >
            {notification.module}
          </span>
        </div>
        <p className="text-sm leading-snug text-foreground">{notification.title}</p>
        {notification.deadline && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Due {new Date(notification.deadline).toLocaleDateString()}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="mt-0.5 flex-shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss notification"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Bell + tray
// ---------------------------------------------------------------------------

export function NotificationBell(): JSX.Element {
  const { notifications, count, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // Close the tray when the user clicks outside it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full",
          "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          open && "bg-muted text-foreground",
        )}
        aria-label={`Notifications — ${count} open`}
      >
        <BellIcon className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Tray dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
          {/* Tray header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {count > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {count} open
              </span>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <BellIcon className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No open notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => (
                  <NotificationItem key={n.id} notification={n} onDismiss={dismiss} />
                ))}
              </ul>
            )}
          </div>

          {/* Tray footer */}
          <div className="border-t border-border px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); void navigate("/dashboard"); }}
              className="text-xs text-primary hover:underline"
            >
              Go to dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
