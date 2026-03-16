import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { employeeService } from "@/services/employee.service";
import { employeeKeys } from "./employeeKeys";

export function useArchiveEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeService.archiveEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success("Employee moved to offboarding.");
    },
    onError: () => {
      toast.error("Failed to archive employee.");
    },
  });
}
