import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { skillManagementService } from "@/services/skill-management.service";
import { skillKeys } from "./skillKeys";

export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: skillManagementService.createSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all });
      toast.success("Skill added.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add skill.");
    },
  });
}
