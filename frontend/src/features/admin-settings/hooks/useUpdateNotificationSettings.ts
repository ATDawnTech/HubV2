import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationSettingsService } from "@/services/notification-settings.service";
import type { SetModuleTogglesInput, UpdateNotificationSettingsInput } from "../types/notification-settings.types";
import { notificationKeys } from "./notificationKeys";

export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNotificationSettingsInput) =>
      notificationSettingsService.updateSettings(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.settings() });
    },
  });
}

export function useSetNotificationToggles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetModuleTogglesInput) =>
      notificationSettingsService.setToggles(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.toggles() });
    },
  });
}
