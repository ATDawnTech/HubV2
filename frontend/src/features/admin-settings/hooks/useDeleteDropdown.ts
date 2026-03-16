import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { adminSettingsService } from "@/services/admin-settings.service";
import { adminSettingsKeys } from "./adminSettingsKeys";

export function useDeleteDropdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminSettingsService.deleteDropdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSettingsKeys.dropdowns() });
      queryClient.invalidateQueries({ queryKey: adminSettingsKeys.dropdownOptionsAll() });
      toast.success("Option removed.");
    },
    onError: () => {
      toast.error("Failed to remove option.");
    },
  });
}
