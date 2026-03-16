import { useQuery } from "@tanstack/react-query";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";

export function useDefaultPermissions() {
  return useQuery({
    queryKey: roleKeys.defaultPermissions(),
    queryFn: () => roleService.getDefaultPermissions(),
  });
}
