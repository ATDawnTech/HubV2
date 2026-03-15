import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roleService } from "@/services/role.service";
import { roleKeys } from "./roleKeys";

export function useSortRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orders: Array<{ role_id: string; sort_order: number }>) =>
      roleService.setSortOrders(orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.list() });
    },
  });
}
