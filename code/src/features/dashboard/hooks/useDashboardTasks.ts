import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { dashboardService } from "@/services/dashboard.service";
import { dashboardKeys } from "./dashboardKeys";

interface Options {
  enabled?: boolean;
}

export function useDashboardTasks({ enabled = true }: Options = {}) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const query = useQuery({
    queryKey: dashboardKeys.tasks(cursor),
    queryFn: () => dashboardService.getTasks(cursor),
    staleTime: 30_000,
    enabled,
  });

  function goToNextPage(): void {
    const next = query.data?.meta.next_cursor;
    if (next) setCursor(next);
  }

  function goToPrevPage(): void {
    const prev = query.data?.meta.prev_cursor;
    if (prev) setCursor(prev);
    else setCursor(undefined);
  }

  return {
    ...query,
    goToNextPage,
    goToPrevPage,
    hasNextPage: Boolean(query.data?.meta.next_cursor),
    hasPrevPage: Boolean(query.data?.meta.prev_cursor),
  };
}
