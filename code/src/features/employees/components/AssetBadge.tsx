import { useRef, useState, useEffect } from "react";

// Placeholder shape — replaced by real API data in Epic 4
export interface Asset {
  id: string;
  name: string;
  type: string;
}

export function AssetBadge({ assets }: { assets: Asset[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = assets.length;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => count > 0 && setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          count > 0
            ? "cursor-pointer border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
            : "cursor-default border-border bg-muted text-muted-foreground"
        }`}
      >
        <span className="font-semibold">{count}</span>
        {count === 1 ? "Asset" : "Assets"}
        {count > 0 && <span className="text-[10px]">{open ? "▴" : "▾"}</span>}
      </button>

      {open && count > 0 && (
        <div className="absolute left-0 top-8 z-20 min-w-[220px] rounded-md border border-border bg-card shadow-lg">
          <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Assigned Assets
          </p>
          <ul className="divide-y divide-border">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm text-card-foreground">
                <span>{a.name}</span>
                <span className="ml-3 text-xs text-muted-foreground">{a.type}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Full asset management available in the Asset module.
          </p>
        </div>
      )}
    </div>
  );
}
