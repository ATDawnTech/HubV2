import { useQuery } from "@tanstack/react-query";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";

export function useRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => roleService.getRole(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: "always",
  });
}
