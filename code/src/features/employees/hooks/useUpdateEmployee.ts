import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { employeeService } from "@/services/employee.service";
import type { UpdateEmployeeInput } from "../types/employee.types";
import { employeeKeys } from "./employeeKeys";

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEmployeeInput) =>
      employeeService.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.roles(id) });
      toast.success("Employee updated successfully.");
    },
    onError: () => {
      toast.error("Failed to update employee.");
    },
  });
}
