import { useQuery } from "@tanstack/react-query";
import { notificationSettingsService } from "@/services/notification-settings.service";
import { notificationKeys } from "./notificationKeys";

export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationKeys.settings(),
    queryFn: () => notificationSettingsService.getSettings(),
  });
}

export function useNotificationToggles() {
  return useQuery({
    queryKey: notificationKeys.toggles(),
    queryFn: () => notificationSettingsService.listToggles(),
  });
}
