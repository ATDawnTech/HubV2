import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { employeeService } from "@/services/employee.service";
import { employeeKeys } from "./employeeKeys";

export function useOffboardingEmployees() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const query = useQuery({
    queryKey: employeeKeys.offboardingList(cursor),
    queryFn: () => employeeService.listOffboarding(cursor),
    staleTime: 30_000,
  });

  return {
    ...query,
    goToNextPage: () => {
      const next = query.data?.meta.next_cursor;
      if (next) setCursor(next);
    },
    goToPrevPage: () => setCursor(undefined),
    hasNextPage: Boolean(query.data?.meta.next_cursor),
    hasPrevPage: Boolean(cursor),
  };
}
