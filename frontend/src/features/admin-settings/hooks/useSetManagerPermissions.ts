import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";
import type { SetPermissionsInput } from "../types/role.types";

export function useSetManagerPermissions(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetPermissionsInput) =>
      roleService.setManagerPermissions(roleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.managerPermissions(roleId) });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      toast.success("Manager permissions saved.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save manager permissions.");
    },
  });
}
