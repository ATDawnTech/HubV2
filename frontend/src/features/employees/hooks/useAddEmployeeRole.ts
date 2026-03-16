import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { employeeKeys } from "./employeeKeys";

/** Assign a role to an employee from the employee view modal. */
export function useAddEmployeeRole(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) =>
      roleService.assignRole(roleId, { employee_id: employeeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.roles(employeeId) });
      toast.success("Role assigned.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to assign role.");
    },
  });
}
