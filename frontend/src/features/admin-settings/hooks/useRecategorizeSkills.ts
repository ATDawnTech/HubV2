import { useMutation, useQueryClient } from "@tanstack/react-query";
import { skillManagementService } from "@/services/skill-management.service";
import { skillKeys } from "./skillKeys";

export function useRecategorizeSkills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ from, to }: { from: string | null; to: string | null }) =>
      skillManagementService.bulkRecategorize(from, to),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}
