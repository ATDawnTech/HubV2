import { useQuery } from "@tanstack/react-query";
import { skillManagementService } from "@/services/skill-management.service";
import { skillKeys } from "./skillKeys";

export function useSkillCategories() {
  const { data = [], ...rest } = useQuery({
    queryKey: skillKeys.categories(),
    queryFn: () => skillManagementService.listCategories(),
    staleTime: 60_000,
  });
  return { categories: data, ...rest };
}
