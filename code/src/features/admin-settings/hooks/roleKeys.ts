export const roleKeys = {
  all: ["roles"] as const,
  list: () => [...roleKeys.all, "list"] as const,
  detail: (id: string) => [...roleKeys.all, "detail", id] as const,
  permissions: (id: string) => [...roleKeys.all, "permissions", id] as const,
  grantable: (id: string) => [...roleKeys.all, "grantable", id] as const,
  assignments: (id: string) => [...roleKeys.all, "assignments", id] as const,
  managerPermissions: (id: string) => [...roleKeys.all, "manager-permissions", id] as const,
  defaultPermissions: () => [...roleKeys.all, "default-permissions"] as const,
};
