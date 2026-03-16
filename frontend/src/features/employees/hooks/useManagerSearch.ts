import { useEffect, useState } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { employeeService } from "@/services/employee.service";
import type { Employee } from "../types/employee.types";

/**
 * Searches for active/new_onboard employees by name — used by the manager picker.
 * Status-enforced per spec 2.7: archiving/archived employees are excluded.
 *
 * R4: wraps employeeService so ManagerPickerField has no direct service calls.
 */
export function useManagerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    employeeService
      .listEmployees({ q: debouncedQuery.toLowerCase(), status: ["active", "new_onboard"], limit: 8 })
      .then((data) => setResults(data.employees))
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false));
  }, [debouncedQuery]);

  function clearResults() {
    setResults([]);
    setQuery("");
  }

  return { query, setQuery, results, isLoading, debouncedQuery, clearResults };
}
