import { useEffect, useRef, useState } from "react";

export function ToolbarDropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-orange-500 px-3 py-1.5 text-xs font-medium text-orange-500 hover:bg-orange-500/10"
      >
        {label}
        <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-8 z-10 min-w-[160px] rounded-md border border-border bg-card shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
