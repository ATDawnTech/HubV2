export const skillKeys = {
  all: ["skills"] as const,
  list: (params?: Record<string, unknown>) => [...skillKeys.all, "list", params ?? {}] as const,
  categories: () => [...skillKeys.all, "categories"] as const,
};
