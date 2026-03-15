import { useQuery } from "@tanstack/react-query";
import { adminSettingsService } from "@/services/admin-settings.service";
import { adminSettingsKeys } from "./adminSettingsKeys";

/** Fetch paginated dropdown entries for the admin management UI. */
export function useDropdownsByModule(module: string, category?: string) {
  return useQuery({
    queryKey: adminSettingsKeys.dropdownsByModule(module, category),
    queryFn: () =>
      adminSettingsService.listDropdowns({ module, ...(category !== undefined ? { category } : {}), limit: 100 }),
    staleTime: 30_000,
  });
}
