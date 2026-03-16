export const notificationKeys = {
  all: ["notification-settings"] as const,
  settings: () => [...notificationKeys.all, "global"] as const,
  toggles: () => [...notificationKeys.all, "toggles"] as const,
};
