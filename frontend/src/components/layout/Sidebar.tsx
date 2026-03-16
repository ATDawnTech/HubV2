import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/cn";
import { NAV_PERMISSION_MAP } from "@/lib/navPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useDarkMode } from "@/hooks/useDarkMode";
import { NAV_ITEMS } from "./navConfig";
import type { NavItem } from "./navConfig";
import logoColor from "@/assets/logo-color.png";

export function Sidebar(): JSX.Element {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, toggleDark] = useDarkMode();
  const { hasPermission, hasAnyPermissionInModule, isLoading: permsLoading } = usePermissions();

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (permsLoading) return true;
    const rule = NAV_PERMISSION_MAP[item.path];
    if (!rule) return true;
    if (rule.permission) return hasPermission(rule.permission.module, rule.permission.action);
    if (rule.anyInModule) return hasAnyPermissionInModule(rule.anyInModule);
    return true;
  });

  const [expanded, setExpanded] = useState<string[]>(() => {
    const initial: string[] = [];
    for (const item of NAV_ITEMS) {
      if (item.children) {
        const isActive = item.children.some((c) => location.pathname.startsWith(c.path));
        if (isActive || item.label === "Employees") initial.push(item.label);
      }
    }
    return initial;
  });

  function toggleGroup(label: string): void {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }

  function isGroupActive(item: NavItem): boolean {
    if (item.children) {
      return item.children.some((c) => location.pathname.startsWith(c.path));
    }
    return location.pathname === item.path || location.pathname.startsWith(item.path + "/");
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-shrink-0 flex-col border-r border-border bg-card overflow-hidden",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-16" : "w-52",
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex h-14 flex-shrink-0 items-center border-b border-border transition-[padding] duration-300",
        collapsed ? "justify-end pr-1" : "justify-between pl-4 pr-2",
      )}>
        {/* Logo — fades out and collapses width when sidebar closes */}
        <div className={cn(
          "flex items-center gap-2 overflow-hidden transition-[opacity,width] duration-300",
          collapsed ? "opacity-0 w-0" : "opacity-100 w-auto",
        )}>
          <img src={logoColor} alt="AT Dawn Technologies" className="h-7 w-auto flex-shrink-0" />
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary whitespace-nowrap">
            V2
          </span>
        </div>

        {/* Collapse / expand button */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <span
            className={cn(
              "text-base leading-none transition-transform duration-300",
              collapsed ? "rotate-180" : "",
            )}
          >
            ‹
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        <ul className="space-y-0.5">
          {visibleNavItems.map((item) => {
            const active = isGroupActive(item);
            const isOpen = expanded.includes(item.label);

            if (item.comingSoon) {
              return (
                <li key={item.label}>
                  <span className="flex cursor-not-allowed items-center rounded-md px-3 py-2 text-sm text-muted-foreground/40 whitespace-nowrap overflow-hidden">
                    <span className={cn("transition-[opacity,width] duration-200 overflow-hidden", collapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
                      {item.label}
                    </span>
                    {!collapsed && <span className="ml-auto text-[10px]">Soon</span>}
                  </span>
                </li>
              );
            }

            if (item.children) {
              return (
                <li key={item.label}>
                  <button
                    onClick={() => !collapsed && toggleGroup(item.label)}
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden",
                      active ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className={cn("transition-[opacity,width] duration-200 overflow-hidden min-w-0", collapsed ? "opacity-0 w-0" : "opacity-100 flex-1 text-left")}>
                      {item.label}
                    </span>
                    {!collapsed && (
                      <span className={cn("ml-auto text-xs transition-transform duration-150", isOpen ? "rotate-90" : "")}>
                        ›
                      </span>
                    )}
                  </button>
                  {isOpen && !collapsed && (
                    <ul className="mt-0.5 space-y-0.5 border-l border-border ml-3 pl-3">
                      {item.children.filter((child) => {
                        if (permsLoading) return true;
                        const rule = NAV_PERMISSION_MAP[child.path];
                        if (!rule) return true;
                        if (rule.permission) return hasPermission(rule.permission.module, rule.permission.action);
                        if (rule.anyInModule) return hasAnyPermissionInModule(rule.anyInModule);
                        return true;
                      }).map((child) => (
                        <li key={child.path}>
                          {child.comingSoon ? (
                            <span className="flex cursor-not-allowed items-center rounded-md px-3 py-1.5 text-sm text-muted-foreground/40">
                              {child.label}
                              <span className="ml-auto text-[10px]">Soon</span>
                            </span>
                          ) : (
                            <NavLink
                              to={child.path}
                              end={child.path === "/employees"}
                              className={({ isActive }) =>
                                cn(
                                  "block rounded-md px-3 py-1.5 text-sm transition-colors",
                                  isActive
                                    ? "bg-primary/10 font-medium text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )
                              }
                            >
                              {child.label}
                            </NavLink>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.label}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <span className={cn("transition-[opacity,width] duration-200 overflow-hidden", collapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={toggleDark}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground overflow-hidden"
        >
          {dark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0 text-yellow-400">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          <span className={cn(
            "text-xs whitespace-nowrap transition-[opacity,width] duration-200 overflow-hidden",
            collapsed ? "opacity-0 w-0" : "opacity-100 w-auto",
          )}>
            {dark ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
        <p className={cn(
          "mt-1 px-2 text-xs text-muted-foreground/50 whitespace-nowrap transition-[opacity] duration-200",
          collapsed ? "opacity-0" : "opacity-100",
        )}>
          AT Dawn Tech
        </p>
      </div>
    </aside>
  );
}
