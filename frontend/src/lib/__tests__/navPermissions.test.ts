import { describe, it, expect } from "vitest";
import { NAV_PERMISSION_MAP } from "../navPermissions";

describe("NAV_PERMISSION_MAP", () => {
  it("maps /employees to employees:view_module", () => {
    expect(NAV_PERMISSION_MAP["/employees"]).toEqual({
      permission: { module: "employees", action: "view_module" },
    });
  });

  it("maps /employees/offboarding to offboarding:view_module", () => {
    expect(NAV_PERMISSION_MAP["/employees/offboarding"]).toEqual({
      permission: { module: "offboarding", action: "view_module" },
    });
  });

  it("maps /assets to assets:view_module", () => {
    expect(NAV_PERMISSION_MAP["/assets"]).toEqual({
      permission: { module: "assets", action: "view_module" },
    });
  });

  it("maps /admin-settings to admin:view_module", () => {
    expect(NAV_PERMISSION_MAP["/admin-settings"]).toEqual({
      permission: { module: "admin", action: "view_module" },
    });
  });

  it("maps /intake to intake:view_module", () => {
    expect(NAV_PERMISSION_MAP["/intake"]).toEqual({
      permission: { module: "intake", action: "view_module" },
    });
  });

  it("maps /onboarding to onboarding:view_module", () => {
    expect(NAV_PERMISSION_MAP["/onboarding"]).toEqual({
      permission: { module: "onboarding", action: "view_module" },
    });
  });

  it("maps /projects to project_management:view_module", () => {
    expect(NAV_PERMISSION_MAP["/projects"]).toEqual({
      permission: { module: "project_management", action: "view_module" },
    });
  });

  it("maps /timesheets to timesheets:view_module", () => {
    expect(NAV_PERMISSION_MAP["/timesheets"]).toEqual({
      permission: { module: "timesheets", action: "view_module" },
    });
  });

  it("returns undefined for unlisted routes (visible to all)", () => {
    expect(NAV_PERMISSION_MAP["/dashboard"]).toBeUndefined();
    expect(NAV_PERMISSION_MAP["/profile"]).toBeUndefined();
    expect(NAV_PERMISSION_MAP["/"]).toBeUndefined();
  });

  it("all defined rules use view_module as action (sidebar visibility gates)", () => {
    for (const rule of Object.values(NAV_PERMISSION_MAP)) {
      if (rule.permission) {
        expect(rule.permission.action).toBe("view_module");
      }
    }
  });
});
