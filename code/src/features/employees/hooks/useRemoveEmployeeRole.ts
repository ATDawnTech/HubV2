import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { employeeKeys } from "./employeeKeys";

/** Remove a role from an employee and optionally blacklist to prevent auto-reassignment. */
export function useRemoveEmployeeRole(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, blacklist = true }: { roleId: string; blacklist?: boolean }) =>
      roleService.unassignRole(roleId, employeeId, blacklist),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.roles(employeeId) });
      toast.success("Role removed.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove role.");
    },
  });
}
