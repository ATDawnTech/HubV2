import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { adminSettingsService } from "@/services/admin-settings.service";
import { adminSettingsKeys } from "./adminSettingsKeys";

export function useCreateDropdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminSettingsService.createDropdown,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSettingsKeys.dropdowns() });
      queryClient.invalidateQueries({ queryKey: adminSettingsKeys.dropdownOptionsAll() });
      toast.success("Option added.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add option.");
    },
  });
}
