import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) => roleService.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.list() });
      toast.success("Role deleted.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete role.");
    },
  });
}
