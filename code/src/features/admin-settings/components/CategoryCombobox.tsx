import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  categories: string[];
  placeholder?: string;
}

export function CategoryCombobox({ value, onChange, categories, placeholder = "e.g. Frontend" }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = categories.filter(
    (c) => c.toLowerCase().includes(value.toLowerCase()) && c.toLowerCase() !== value.toLowerCase(),
  );
  const isNew = value.trim() !== "" && !categories.some((c) => c.toLowerCase() === value.trim().toLowerCase());
  const showDropdown = open && (filtered.length > 0 || isNew);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSelect(cat: string) {
    onChange(cat);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {showDropdown && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          <ul className="max-h-44 overflow-y-auto py-1">
            {filtered.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(cat); }}
                  className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent"
                >
                  {cat}
                </button>
              </li>
            ))}
            {isNew && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(value.trim()); }}
                  className="w-full px-3 py-1.5 text-left text-sm text-primary hover:bg-accent"
                >
                  + Create "{value.trim()}"
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
