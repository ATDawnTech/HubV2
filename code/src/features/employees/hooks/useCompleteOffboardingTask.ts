import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { employeeService } from "@/services/employee.service";
import { employeeKeys } from "./employeeKeys";

export function useCompleteOffboardingTask(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      employeeService.completeOffboardingTask(employeeId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.offboarding() });
      toast.success("Task completed.");
    },
    onError: () => {
      toast.error("Failed to complete task.");
    },
  });
}
