import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { employeeService } from "@/services/employee.service";
import type { EmployeeListParams } from "../types/employee.types";
import { employeeKeys } from "./employeeKeys";

interface Options {
  enabled?: boolean;
  q?: string | undefined;
  status?: string[] | undefined;
  department?: string[] | undefined;
  location?: string[] | undefined;
  hire_type?: string[] | undefined;
  work_mode?: string[] | undefined;
  job_title?: string | undefined;
  hire_date_from?: string | undefined;
  hire_date_to?: string | undefined;
  limit?: number | undefined;
}

export function useEmployees({
  enabled = true,
  q,
  status,
  department,
  location,
  hire_type,
  work_mode,
  job_title,
  hire_date_from,
  hire_date_to,
  limit = 25,
}: Options = {}) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const params: EmployeeListParams = { cursor, q, status, department, location, hire_type, work_mode, job_title, hire_date_from, hire_date_to, limit };

  const query = useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => employeeService.listEmployees(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  });

  function goToNextPage(): void {
    const next = query.data?.meta.next_cursor;
    if (next) setCursor(next);
  }

  function goToPrevPage(): void {
    setCursor(undefined);
  }

  function resetPage(): void {
    setCursor(undefined);
  }

  return {
    ...query,
    goToNextPage,
    goToPrevPage,
    resetPage,
    hasNextPage: Boolean(query.data?.meta.next_cursor),
    hasPrevPage: Boolean(cursor),
  };
}
