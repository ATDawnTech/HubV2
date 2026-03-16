import { useQuery } from "@tanstack/react-query";
import { employeeService } from "@/services/employee.service";
import type { EmployeeRoleEntry } from "../types/employee.types";
import { employeeKeys } from "./employeeKeys";

export function useEmployeeRoles(employeeId: string) {
  return useQuery<EmployeeRoleEntry[]>({
    queryKey: employeeKeys.roles(employeeId),
    queryFn: () => employeeService.getEmployeeRoles(employeeId),
    enabled: !!employeeId,
    staleTime: 0, // Role assignments change frequently — always refetch on mount
  });
}
