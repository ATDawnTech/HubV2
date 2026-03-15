import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Skill } from "../types/skill-management.types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface SkillChipProps {
  skill: Skill;
  onDelete: (skill: Skill) => void;
}

export function SkillChip({ skill, onDelete }: SkillChipProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popoverHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const goAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    setPos({
      top: goAbove ? rect.top + window.scrollY - popoverHeight - 8 : rect.bottom + window.scrollY + 8,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 272),
    });
  }, []);

  useEffect(() => {
    if (!open) { setPos(null); return; }
    updatePosition();

    function onMouseDown(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          open
            ? "border-orange-500 bg-orange-500/10 text-orange-500"
            : "border-border bg-card text-foreground hover:border-orange-500/50 hover:bg-orange-500/5"
        }`}
      >
        {skill.name}
        <span
          className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
            skill.intake_count > 0
              ? "bg-orange-500/20 text-orange-500"
              : "bg-muted text-muted-foreground/60"
          }`}
        >
          {skill.intake_count}
        </span>
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            style={{ position: "absolute", top: pos.top, left: pos.left }}
            className="z-[100] w-64 rounded-lg border border-border bg-card shadow-xl"
          >
            <div className="space-y-3 p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Skill Name
                </p>
                <p className="text-sm font-medium text-foreground">{skill.name}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Category
                </p>
                <p className="text-sm text-foreground">{skill.category ?? "—"}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Intake Sections
                </p>
                <p className="text-sm text-foreground">{skill.intake_count}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Date Added
                </p>
                <p className="text-sm text-foreground">{formatDate(skill.created_at)}</p>
              </div>
            </div>

            <div className="border-t border-border px-4 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete(skill);
                }}
                className="text-xs font-medium text-destructive hover:text-destructive/80"
              >
                Remove skill
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
