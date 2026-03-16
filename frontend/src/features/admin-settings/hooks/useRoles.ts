import { useQuery } from "@tanstack/react-query";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: () => roleService.listRoles({ limit: 100 }),
  });
}
