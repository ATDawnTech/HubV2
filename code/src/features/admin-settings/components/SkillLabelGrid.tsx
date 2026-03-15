import type { Skill } from "../types/skill-management.types";
import { SkillChip } from "./SkillChip";

interface SkillLabelGridProps {
  skills: Skill[];
  isLoading: boolean;
  isError: boolean;
  search: string;
  pageSize: number;
  onDelete: (skill: Skill) => void;
}

export function SkillLabelGrid({
  skills,
  isLoading,
  isError,
  search,
  pageSize,
  onDelete,
}: SkillLabelGridProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-8 text-center text-sm text-destructive">
        Failed to load skills.
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
        {search ? "No skills match your search." : "No skills yet. Add one above."}
      </div>
    );
  }

  // ~8 chips per row, ~44px per row — keeps height stable when paginating
  const minHeight = Math.ceil(pageSize / 8) * 44;

  return (
    <div className="flex flex-wrap content-start gap-2.5" style={{ minHeight }}>
      {skills.map((skill) => (
        <SkillChip key={skill.id} skill={skill} onDelete={onDelete} />
      ))}
    </div>
  );
}
