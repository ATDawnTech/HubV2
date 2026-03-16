import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { skillManagementService } from "@/services/skill-management.service";
import { skillKeys } from "./skillKeys";

export function useDeleteSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => skillManagementService.deleteSkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all });
      toast.success("Skill removed.");
    },
    onError: () => {
      toast.error("Failed to remove skill.");
    },
  });
}
