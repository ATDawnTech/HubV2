import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useDefaultPermissions } from "../hooks/useDefaultPermissions";
import { useSetDefaultPermissions } from "../hooks/useSetDefaultPermissions";
import { PermissionVerbGrid } from "./PermissionVerbGrid";
import { PermissionNounGrid } from "./PermissionNounGrid";
import type { Permission } from "../types/role.types";

export function DefaultPermissionsPanel(): JSX.Element {
  const { data: defaults, isLoading } = useDefaultPermissions();
  const setDefaults = useSetDefaultPermissions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (defaults) {
      setPermissions(defaults);
      setDirty(false);
    }
  }, [defaults]);

  function handleChange(updated: Permission[], kind: "verb" | "noun") {
    if (kind === "verb") {
      setPermissions([...updated, ...permissions.filter((p) => p.module === "visibility")]);
    } else {
      setPermissions([...permissions.filter((p) => p.module !== "visibility"), ...updated]);
    }
    setDirty(true);
  }

  async function handleSave() {
    await setDefaults.mutateAsync({ permissions });
    setDirty(false);
  }

  function handleReset() {
    if (defaults) setPermissions(defaults);
    setDirty(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between px-5 py-4 text-left transition-colors",
          open
            ? "rounded-t-xl bg-blue-500/10 hover:bg-blue-500/15"
            : "rounded-xl hover:bg-muted/50",
        )}
      >
        <div>
          <h3 className={cn("text-sm font-bold", open ? "text-blue-600" : "text-foreground")}>
            Default Permissions
          </h3>
          <p className={cn("mt-0.5 text-xs", open ? "text-blue-500" : "text-muted-foreground")}>
            Baseline permissions applied to all users without any role assigned
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permissions.length > 0 && !open && (
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              {permissions.length} active
            </span>
          )}
          <span
            className={cn(
              "text-xs transition-transform duration-150",
              open ? "rotate-180 text-blue-500" : "text-muted-foreground",
            )}
          >
            ▼
          </span>
        </div>
      </button>

      {open && (
        <div className="space-y-5 border-t border-border px-5 py-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Action Permissions
                </h4>
                <PermissionVerbGrid
                  selected={permissions.filter((p) => p.module !== "visibility")}
                  onChange={(updated) => handleChange(updated, "verb")}
                />
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Visibility Permissions
                </h4>
                <PermissionNounGrid
                  selected={permissions.filter((p) => p.module === "visibility")}
                  onChange={(updated) => handleChange(updated, "noun")}
                />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  These permissions apply to every user, even those without a role.
                </p>
                <div className="flex items-center gap-2">
                  {dirty && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || setDefaults.isPending}
                    className={cn(
                      "rounded-md px-4 py-1.5 text-xs font-medium text-primary-foreground transition-colors",
                      !dirty || setDefaults.isPending
                        ? "cursor-not-allowed bg-primary/50"
                        : "bg-primary hover:bg-primary/90",
                    )}
                  >
                    {setDefaults.isPending ? "Saving..." : "Save Defaults"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
