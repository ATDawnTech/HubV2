import { useEffect, useRef, useState } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  hasError?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "— Select —",
  hasError = false,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-background ${
          hasError ? "border-destructive" : "border-input"
        } ${selected ? "text-foreground" : "text-muted-foreground"}`}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <span className={`text-[10px] text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-orange-500/10 ${!value ? "bg-orange-500/10 font-medium text-orange-500" : "text-muted-foreground"}`}
          >
            {placeholder}
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-orange-500/10 ${value === o.value ? "bg-orange-500/10 font-medium text-orange-500" : "text-card-foreground"}`}
            >
              {value === o.value ? (
                <span className="text-[10px] text-orange-500">✓</span>
              ) : (
                <span className="w-3" />
              )}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
