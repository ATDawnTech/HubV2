export const adminSettingsKeys = {
  all: ["admin-settings"] as const,
  dropdowns: () => [...adminSettingsKeys.all, "dropdowns"] as const,
  dropdownsByModule: (module: string, category?: string) =>
    [...adminSettingsKeys.dropdowns(), module, category ?? "all"] as const,
  // Prefix used to invalidate ALL dropdown-options queries at once
  dropdownOptionsAll: () => [...adminSettingsKeys.all, "dropdown-options"] as const,
  dropdownOptions: (module: string, category?: string) =>
    [...adminSettingsKeys.dropdownOptionsAll(), module, category ?? "all"] as const,
};
