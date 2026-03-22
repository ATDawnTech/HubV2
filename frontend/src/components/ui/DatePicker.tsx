import * as React from "react";
import { cn } from "../../lib/cn";

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange?: (date: string) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * A custom DatePicker component styled for HubV2.
 * Uses native Date objects for calculation and returns YYYY-MM-DD strings.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date...",
  hasError,
  className,
  disabled,
}: DatePickerProps): JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => (value ? new Date(value) : new Date()));
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside
  React.useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevPadding = Array.from({ length: firstDayOfMonth }, (_, i) => prevMonthLastDay - firstDayOfMonth + i + 1);

  const formattedDate = React.useMemo(() => {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  }, [value]);

  const handleDaySelect = (day: number) => {
    const selectedDate = new Date(year, month, day);
    // Format to YYYY-MM-DD local
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    onChange?.(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const d = new Date(value);
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
          hasError ? "border-destructive text-destructive" : "border-input text-foreground hover:border-primary",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{formattedDate || placeholder}</span>
        <span className="material-symbols-outlined text-lg opacity-50">calendar_today</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-card p-3 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <div className="text-sm font-semibold">
              {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(viewDate)}
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          {/* Weekdays */}
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {prevPadding.map((d) => (
              <div key={`prev-${d}`} className="h-8 text-center text-sm text-muted-foreground/30 flex items-center justify-center">
                {d}
              </div>
            ))}
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDaySelect(d)}
                className={cn(
                  "h-8 w-8 rounded-md text-sm transition-all hover:bg-primary/10 hover:text-primary flex items-center justify-center",
                  isToday(d) && !isSelected(d) && "border border-primary/30 text-primary font-bold",
                  isSelected(d) && "bg-primary text-white hover:bg-primary hover:text-white font-semibold shadow-sm"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Footer - Clear / Today */}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-2 text-[10px]">
             <button
              type="button"
              onClick={() => { onChange?.(""); setIsOpen(false); }}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, "0");
                const d = String(today.getDate()).padStart(2, "0");
                onChange?.(`${y}-${m}-${d}`);
                setIsOpen(false);
              }}
              className="font-medium text-primary hover:underline"
            >
              Go to Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
