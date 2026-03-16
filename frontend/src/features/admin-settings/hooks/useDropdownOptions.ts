import { useQuery } from "@tanstack/react-query";
import { adminSettingsService } from "@/services/admin-settings.service";
import { adminSettingsKeys } from "./adminSettingsKeys";

/**
 * Fetch active dropdown options for a given module + category.
 * Used by consumer forms (employee create/edit) to populate selects dynamically.
 */
export function useDropdownOptions(module: string, category?: string) {
  return useQuery({
    queryKey: adminSettingsKeys.dropdownOptions(module, category),
    queryFn: () => adminSettingsService.getOptions(module, category),
    staleTime: 5 * 60_000, // 5 minutes — dropdown lists change infrequently
  });
}
