import { useQuery } from "@tanstack/react-query";
import { skillManagementService } from "@/services/skill-management.service";
import { skillKeys } from "./skillKeys";
import type { SkillsListParams } from "../types/skill-management.types";

export function useSkills(params: SkillsListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: skillKeys.list(params as Record<string, unknown>),
    queryFn: () => skillManagementService.listSkills(params),
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}
