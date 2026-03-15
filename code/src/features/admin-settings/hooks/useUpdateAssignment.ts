import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";
import type { UpdateAssignmentInput } from "../types/role.types";
import { employeeKeys } from "@/features/employees/hooks/employeeKeys";

export function useUpdateAssignment(roleId: string, employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAssignmentInput) =>
      roleService.updateAssignment(roleId, employeeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.assignments(roleId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.roles(employeeId) });
      toast.success("Assignment updated.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update assignment.");
    },
  });
}
