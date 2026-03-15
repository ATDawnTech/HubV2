import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";
import type { UpdateRoleInput } from "../types/role.types";

export function useUpdateRole(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateRoleInput) => roleService.updateRole(roleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      queryClient.invalidateQueries({ queryKey: roleKeys.list() });
      toast.success("Role updated.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update role.");
    },
  });
}
