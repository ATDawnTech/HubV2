import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { adminSettingsService } from "@/services/admin-settings.service";
import type { ReassignEmployeesInput } from "../types/admin-settings.types";
import { adminSettingsKeys } from "./adminSettingsKeys";

export function useReassignEmployees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReassignEmployeesInput) =>
      adminSettingsService.reassignEmployees(input),
    onSuccess: (data) => {
      // Invalidate dropdown options so consumer forms reflect updated values
      queryClient.invalidateQueries({ queryKey: adminSettingsKeys.dropdownOptions("employees") });
      queryClient.invalidateQueries({ queryKey: adminSettingsKeys.dropdownOptions("global") });
      // Invalidate employee list so stale-highlight re-evaluates
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(`Reassigned ${data.affected} employee${data.affected !== 1 ? "s" : ""}.`);
    },
    onError: () => {
      toast.error("Failed to reassign employees.");
    },
  });
}
