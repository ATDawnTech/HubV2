import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";

export function useSetGrantableRoles(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignableRoleIds: string[]) =>
      roleService.setGrantableRoles(roleId, assignableRoleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.grantable(roleId) });
      toast.success("Assignment permissions saved.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save assignment permissions.");
    },
  });
}
