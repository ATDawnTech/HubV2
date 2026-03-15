import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";
import { employeeKeys } from "@/features/employees/hooks/employeeKeys";
import type { AssignRoleInput } from "../types/role.types";

export function useAssignRole(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignRoleInput) => roleService.assignRole(roleId, input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.assignments(roleId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.roles(input.employee_id) });
      toast.success("Role assigned.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to assign role.");
    },
  });
}
