import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";
import type { SetPermissionsInput } from "../types/role.types";

export function useSetPermissions(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetPermissionsInput) => roleService.setPermissions(roleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.permissions(roleId) });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      toast.success("Permissions saved.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save permissions.");
    },
  });
}
