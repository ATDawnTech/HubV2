import { VERB_PERMISSIONS } from "../types/role.types";
import type { Permission } from "../types/role.types";

export const GROUPED = VERB_PERMISSIONS.reduce<Record<string, string[]>>((acc, p) => {
  if (!acc[p.module]) acc[p.module] = [];
  acc[p.module]!.push(p.action);
  return acc;
}, {});

export function isSelected(selected: Permission[], module: string, action: string): boolean {
  return selected.some((p) => p.module === module && p.action === action);
}

export function hasOtherPermsInModule(selected: Permission[], module: string): boolean {
  return selected.some((p) => p.module === module && p.action !== "view_module");
}

export const ACTION_DEPS: Record<string, string[]> = {
  access_employee_admin_mode: ["archive_employee", "export_employees"],
};

export function isLockedByActionDep(selected: Permission[], module: string, action: string): boolean {
  const deps = ACTION_DEPS[action];
  if (!deps) return false;
  return deps.some((dep) => isSelected(selected, module, dep));
}

export function getModuleLevel(selected: Permission[], module: string, actions: string[]): "none" | "view" | "full" | "custom" {
  const modulePerms = selected.filter((p) => p.module === module);
  if (modulePerms.length === 0) return "none";
  if (modulePerms.length === 1 && modulePerms[0]!.action === "view_module") return "view";
  if (modulePerms.length === actions.length) return "full";
  return "custom";
}
