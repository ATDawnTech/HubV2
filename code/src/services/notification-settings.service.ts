import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api.types";
import type {
  ModuleToggle,
  NotificationSettings,
  SetModuleTogglesInput,
  UpdateNotificationSettingsInput,
} from "@/features/admin-settings/types/notification-settings.types";

export const notificationSettingsService = {
  async getSettings(): Promise<NotificationSettings> {
    const res = await apiClient.get<ApiResponse<NotificationSettings>>(
      "/v1/admin/notifications",
    );
    return res.data.data!;
  },

  async updateSettings(input: UpdateNotificationSettingsInput): Promise<NotificationSettings> {
    const res = await apiClient.patch<ApiResponse<NotificationSettings>>(
      "/v1/admin/notifications",
      input,
    );
    return res.data.data!;
  },

  async listToggles(): Promise<ModuleToggle[]> {
    const res = await apiClient.get<ApiResponse<ModuleToggle[]>>(
      "/v1/admin/notifications/toggles",
    );
    return res.data.data ?? [];
  },

  async setToggles(input: SetModuleTogglesInput): Promise<ModuleToggle[]> {
    const res = await apiClient.put<ApiResponse<ModuleToggle[]>>(
      "/v1/admin/notifications/toggles",
      input,
    );
    return res.data.data ?? [];
  },
};
