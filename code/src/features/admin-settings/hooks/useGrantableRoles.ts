import { useQuery } from "@tanstack/react-query";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";

export function useGrantableRoles(roleId: string) {
  return useQuery({
    queryKey: roleKeys.grantable(roleId),
    queryFn: () => roleService.getGrantableRoles(roleId),
    enabled: !!roleId,
  });
}
