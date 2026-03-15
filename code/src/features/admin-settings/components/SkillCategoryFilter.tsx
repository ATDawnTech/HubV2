import { useEffect, useRef, useState } from "react";

interface Props {
  categories: string[];
  selected: string | null;
  onChange: (cat: string | null) => void;
}

export function SkillCategoryFilter({ categories, selected, onChange }: Props): JSX.Element {
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

  const isActive = selected !== null;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "border-orange-500 bg-orange-500 text-white"
            : "border-border text-muted-foreground hover:border-orange-500 hover:text-orange-500"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="4" y1="8" x2="12" y2="8" />
          <line x1="6" y1="12" x2="10" y2="12" />
        </svg>
        <span>{isActive ? selected : "Category"}</span>
        {isActive && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-orange-500">
            1
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-orange-500/10 ${
              !isActive ? "bg-orange-500/10 font-medium text-orange-500" : "text-card-foreground"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { onChange(cat); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-orange-500/10 ${
                selected === cat ? "bg-orange-500/10 font-medium text-orange-500" : "text-card-foreground"
              }`}
            >
              {selected === cat && <span className="text-[10px] text-orange-500">✓</span>}
              {selected !== cat && <span className="w-3" />}
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
