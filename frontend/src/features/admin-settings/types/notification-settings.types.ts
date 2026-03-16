export interface NotificationSettings {
  email_enabled: boolean;
  inapp_enabled: boolean;
  offboarding_deadline_hours: number;
  escalation_warning_hours: number;
  warranty_alert_days: number;
  updated_by: string | null;
  updated_at: string;
}

export interface ModuleToggle {
  module: string;
  channel: "email" | "inapp";
  enabled: boolean;
}

export interface UpdateNotificationSettingsInput {
  email_enabled?: boolean;
  inapp_enabled?: boolean;
  offboarding_deadline_hours?: number;
  escalation_warning_hours?: number;
  warranty_alert_days?: number;
}

export interface SetModuleTogglesInput {
  toggles: ModuleToggle[];
}
