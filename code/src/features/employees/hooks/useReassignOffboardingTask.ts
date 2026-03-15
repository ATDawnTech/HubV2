import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { employeeService } from "@/services/employee.service";
import { employeeKeys } from "./employeeKeys";

export function useReassignOffboardingTask(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, assigneeId }: { taskId: string; assigneeId: string | null }) =>
      employeeService.reassignOffboardingTask(employeeId, taskId, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.offboarding() });
      toast.success("Task reassigned.");
    },
    onError: () => {
      toast.error("Failed to reassign task.");
    },
  });
}
