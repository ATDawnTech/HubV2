import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";
import { employeeKeys } from "@/features/employees/hooks/employeeKeys";

export function useUnassignRole(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => roleService.unassignRole(roleId, employeeId),
    onSuccess: (_data, employeeId) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.assignments(roleId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.roles(employeeId) });
      toast.success("Role revoked.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to revoke role.");
    },
  });
}
