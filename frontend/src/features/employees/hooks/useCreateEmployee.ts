import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { employeeService } from "@/services/employee.service";
import type { CreateEmployeeInput } from "../types/employee.types";
import { employeeKeys } from "./employeeKeys";

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeInput) =>
      employeeService.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success("Employee created successfully.");
    },
    onError: () => {
      toast.error("Failed to create employee.");
    },
  });
}
