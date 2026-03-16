import { useQuery } from "@tanstack/react-query";
import { employeeService } from "@/services/employee.service";
import { employeeKeys } from "./employeeKeys";

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeService.getEmployee(id),
    staleTime: 30_000,
    enabled: Boolean(id),
  });
}
