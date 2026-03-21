import axios from "axios";
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
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.error(error.response.data?.detail ?? "Skill is in use and cannot be deleted.");
      } else {
        toast.error("Failed to remove skill.");
      }
    },
  });
}
