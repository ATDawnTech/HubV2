import { useParams } from "react-router-dom";
import { DefaultPermissionsPanel } from "../components/DefaultPermissionsPanel";
import { NotificationSettingsPanel } from "../components/NotificationSettingsPanel";
import { RoleList } from "../components/RoleList";
import { RoleTester } from "../components/RoleTester";
import { SkillManagementPanel } from "../components/SkillManagementPanel";
import { CollapsibleGroup } from "./CollapsibleAreaGroup";
import { AREA_GROUPS } from "./adminSettingsConfig";

export function AdminSettingsPage(): JSX.Element {
  const { subModule } = useParams<{ subModule: string }>();

  return (
    <main className="flex-1 overflow-y-auto px-8 py-6">
      {subModule === "dropdowns" && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Dropdown Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the allowed values for each dropdown field. Changes take effect immediately across all modules.
            </p>
          </div>
          <div className="space-y-3">
            {AREA_GROUPS.map((group) => (
              <CollapsibleGroup key={group.groupLabel} group={group} />
            ))}
          </div>
        </>
      )}

      {subModule === "roles" && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Role & Permission Management</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and configure system roles, define action and visibility permissions, and set role assignment hierarchy.
            </p>
          </div>
          <div className="mb-6">
            <DefaultPermissionsPanel />
          </div>
          <RoleList />
          <div className="mt-8">
            <RoleTester />
          </div>
        </>
      )}

      {subModule === "skills" && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Skill Management</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the global skill library. Skills added here are available across Intake, Onboarding, and Employee profiles.
            </p>
          </div>
          <SkillManagementPanel />
        </>
      )}

      {subModule === "notifications" && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Notification Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure global communication channels, per-module toggles, and timing thresholds for
              task deadlines and warranty alerts.
            </p>
          </div>
          <NotificationSettingsPanel />
        </>
      )}
    </main>
  );
}
