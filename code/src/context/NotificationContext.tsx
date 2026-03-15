/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboardKeys";
import {
  useNotificationSettings,
  useNotificationToggles,
} from "@/features/admin-settings/hooks/useNotificationSettings";
import { toast } from "@/lib/toast";
import type { DashboardTask } from "@/features/dashboard/types/dashboard.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InAppNotification {
  id: string;
  module: string;
  title: string;
  deadline: string | null;
  source_record_id: string;
}

interface NotificationContextValue {
  notifications: InAppNotification[];
  count: number;
  dismiss: (id: string) => void;
  testNotification: () => void;
  testTaskNotification: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

let _testCounter = 0;

export function NotificationProvider({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [injected, setInjected] = useState<InAppNotification[]>([]);

  // Fetch a batch of open tasks specifically for the notification tray.
  // Uses its own query key so it doesn't interfere with the paginated dashboard queries.
  const { data: tasksPage } = useQuery({
    queryKey: ["notifications", "open-tasks"] as const,
    queryFn: () => dashboardService.getTasks(undefined, 50),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: settings } = useNotificationSettings();
  const { data: toggles } = useNotificationToggles();

  // Derive the active notification list:
  //   1. Global in-app kill-switch must be on
  //   2. Per-module inapp toggle must be on (defaults to true when unknown)
  //   3. Task must be open and not locally dismissed
  //   4. Injected test notifications are always shown (not gated by kill-switch)
  const realNotifications = useMemo<InAppNotification[]>(() => {
    if (!settings?.inapp_enabled) return [];

    const tasks = tasksPage?.tasks ?? [];

    return tasks
      .filter((t: DashboardTask) => t.status === "open")
      .filter((t: DashboardTask) => !dismissed.has(t.task_id))
      .filter((t: DashboardTask) => {
        if (!toggles) return true;
        const moduleToggle = toggles.find(
          (toggle) => toggle.module === t.module && toggle.channel === "inapp",
        );
        return moduleToggle?.enabled ?? true;
      })
      .map((t: DashboardTask) => ({
        id: t.task_id,
        module: t.module,
        title: t.title,
        deadline: t.deadline,
        source_record_id: t.source_record_id,
      }));
  }, [tasksPage, settings, toggles, dismissed]);

  const notifications = useMemo<InAppNotification[]>(
    () => [...injected.filter((n) => !dismissed.has(n.id)), ...realNotifications],
    [injected, dismissed, realNotifications],
  );

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const testNotification = useCallback(() => {
    _testCounter += 1;
    const id = `test-${_testCounter}`;
    const newNotification: InAppNotification = {
      id,
      module: "system",
      title: `Test notification #${_testCounter}`,
      deadline: null,
      source_record_id: id,
    };
    setInjected((prev) => [newNotification, ...prev]);
  }, []);

  const testTaskNotification = useCallback(async () => {
    try {
      await dashboardService.createTestTask();
      queryClient.invalidateQueries({ queryKey: dashboardKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.modules() });
      queryClient.invalidateQueries({ queryKey: ["notifications", "open-tasks"] });
      toast.info("Test task created — check your inbox.");
    } catch {
      toast.error("Failed to create test task.");
    }
  }, [queryClient]);

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, count: notifications.length, dismiss, testNotification, testTaskNotification }),
    [notifications, dismiss, testNotification, testTaskNotification],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
