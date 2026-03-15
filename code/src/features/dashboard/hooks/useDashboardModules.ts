import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { dashboardKeys } from "./dashboardKeys";

interface Options {
  enabled?: boolean;
}

export function useDashboardModules({ enabled = true }: Options = {}) {
  return useQuery({
    queryKey: dashboardKeys.modules(),
    queryFn: () => dashboardService.getModules(),
    staleTime: 30_000,
    enabled,
  });
}
