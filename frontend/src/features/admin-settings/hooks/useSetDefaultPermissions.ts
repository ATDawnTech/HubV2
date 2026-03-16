import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";
import type { SetPermissionsInput } from "../types/role.types";

export function useSetDefaultPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetPermissionsInput) => roleService.setDefaultPermissions(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.defaultPermissions() });
      toast.success("Default permissions saved.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save default permissions.");
    },
  });
}
