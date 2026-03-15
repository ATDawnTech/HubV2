import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { skillManagementService } from "@/services/skill-management.service";
import { skillKeys } from "./skillKeys";

export function useBulkDeleteSkills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => skillManagementService.bulkDeleteSkills({ ids }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all });
      toast.success(`${result.deleted_count} skill${result.deleted_count === 1 ? "" : "s"} removed.`);
    },
    onError: () => {
      toast.error("Failed to remove skills.");
    },
  });
}
