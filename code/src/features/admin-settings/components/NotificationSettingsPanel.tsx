import { useState, useEffect } from "react";
import { useNotificationSettings, useNotificationToggles } from "../hooks/useNotificationSettings";
import { useUpdateNotificationSettings, useSetNotificationToggles } from "../hooks/useUpdateNotificationSettings";
import { useNotifications } from "@/context/NotificationContext";
import { Toggle, ThresholdRow, ModuleToggleTable } from "./notificationHelpers";
import type { ModuleToggle } from "../types/notification-settings.types";

export function NotificationSettingsPanel(): JSX.Element {
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useNotificationSettings();
  const { data: rawToggles, isLoading: togglesLoading } = useNotificationToggles();
  const { testNotification, testTaskNotification } = useNotifications();

  const updateSettings = useUpdateNotificationSettings();
  const setToggles = useSetNotificationToggles();

  const [offboardingHours, setOffboardingHours] = useState(72);
  const [escalationHours, setEscalationHours] = useState(24);
  const [warrantyDays, setWarrantyDays] = useState(60);
  const [localToggles, setLocalToggles] = useState<ModuleToggle[]>([]);

  useEffect(() => {
    if (settings) {
      setOffboardingHours(settings.offboarding_deadline_hours);
      setEscalationHours(settings.escalation_warning_hours);
      setWarrantyDays(settings.warranty_alert_days);
    }
  }, [settings]);

  useEffect(() => {
    if (rawToggles) setLocalToggles(rawToggles);
  }, [rawToggles]);

  if (settingsLoading || togglesLoading) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>;
  }

  if (settingsError || !settings) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Failed to load notification settings.
      </div>
    );
  }

  const isSaving = updateSettings.isPending || setToggles.isPending;

  function handleToggleChange(module: string, channel: "email" | "inapp", enabled: boolean) {
    setLocalToggles((prev) =>
      prev.map((t) => t.module === module && t.channel === channel ? { ...t, enabled } : t),
    );
    void setToggles.mutateAsync({ toggles: localToggles.map((t) =>
      t.module === module && t.channel === channel ? { ...t, enabled } : t,
    ) });
  }

  function handleKillSwitchChange(field: "email_enabled" | "inapp_enabled", value: boolean) {
    void updateSettings.mutateAsync({ [field]: value });
  }

  function handleThresholdSave() {
    void updateSettings.mutateAsync({
      offboarding_deadline_hours: offboardingHours,
      escalation_warning_hours: escalationHours,
      warranty_alert_days: warrantyDays,
    });
  }

  const thresholdsDirty =
    offboardingHours !== settings.offboarding_deadline_hours ||
    escalationHours !== settings.escalation_warning_hours ||
    warrantyDays !== settings.warranty_alert_days;

  return (
    <div className="flex min-w-0 flex-col gap-8 xl:flex-row xl:items-start">
      {/* ── Left column: Global Channels + Timing + Test ── */}
      <div className="min-w-0 space-y-8 xl:w-80 xl:shrink-0">
        <section>
          <h3 className="mb-1 text-sm font-bold text-foreground">Global Channels</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Master switches — disabling a channel stops all outgoing communications for that channel across every module.
          </p>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Send alerts to work email addresses</p>
              </div>
              <Toggle checked={settings.email_enabled} onChange={(v) => handleKillSwitchChange("email_enabled", v)} disabled={isSaving} />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">In-App Notifications</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Show alerts in the notification inbox</p>
              </div>
              <Toggle checked={settings.inapp_enabled} onChange={(v) => handleKillSwitchChange("inapp_enabled", v)} disabled={isSaving} />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-bold text-foreground">Timing &amp; Thresholds</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Control how far in advance notifications are triggered for deadlines and warranty expiry.
          </p>
          <div className="divide-y divide-border rounded-lg border border-border bg-card px-5">
            <ThresholdRow label="Offboarding Task Deadline" description="Hours after archive initiation before offboarding tasks are overdue" value={offboardingHours} unit="hours" onChange={setOffboardingHours} disabled={isSaving} />
            <ThresholdRow label="Escalation Warning" description="Hours before a task deadline to send a warning notification" value={escalationHours} unit="hours" onChange={setEscalationHours} disabled={isSaving} />
            <ThresholdRow label="Warranty Alert Lead Time" description="Days before warranty expiry to trigger an alert" value={warrantyDays} unit="days" onChange={setWarrantyDays} disabled={isSaving} />
          </div>
          {thresholdsDirty && (
            <div className="mt-3 flex justify-end">
              <button onClick={handleThresholdSave} disabled={isSaving} className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {isSaving ? "Saving…" : "Save Thresholds"}
              </button>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-1 text-sm font-bold text-foreground">Test Notifications</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Fire test in-app notifications to verify the bell and toast are working end-to-end.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={testNotification} className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5">
              Send Test Notification
            </button>
            <button onClick={testTaskNotification} className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5">
              Send Task Notification
            </button>
          </div>
        </section>
      </div>

      {/* ── Right column: Module Channels ── */}
      <section className="min-w-0 flex-1">
        <h3 className="mb-1 text-sm font-bold text-foreground">Module Channels</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Enable or disable email and in-app notifications per module. Changes take effect immediately.
        </p>
        <ModuleToggleTable
          toggles={localToggles}
          onChange={handleToggleChange}
          disabled={isSaving || !settings.email_enabled && !settings.inapp_enabled}
        />
      </section>
    </div>
  );
}
