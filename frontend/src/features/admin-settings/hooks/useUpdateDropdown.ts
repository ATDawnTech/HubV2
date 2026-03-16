import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { adminSettingsService } from "@/services/admin-settings.service";
import { adminSettingsKeys } from "./adminSettingsKeys";

export function useUpdateDropdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; value?: string; sort_order?: number; is_active?: boolean }) =>
      adminSettingsService.updateDropdown(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSettingsKeys.dropdowns() });
      queryClient.invalidateQueries({ queryKey: adminSettingsKeys.dropdownOptionsAll() });
      toast.success("Option updated.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update option.");
    },
  });
}
