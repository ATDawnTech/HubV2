import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { dashboardKeys } from "./dashboardKeys";

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => dashboardService.completeTask(taskId),
    onSuccess: () => {
      // Invalidate all dashboard queries so both task list and module
      // pending counts refresh after a task is completed.
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
