import { describe, it, expect } from "vitest";
import { adminSettingsKeys } from "../adminSettingsKeys";

describe("adminSettingsKeys", () => {
  // ── Base key ───────────────────────────────────────────────────────────────

  it("all is a stable tuple containing 'admin-settings'", () => {
    expect(adminSettingsKeys.all).toEqual(["admin-settings"]);
  });

  // ── dropdowns ─────────────────────────────────────────────────────────────

  it("dropdowns extends all with 'dropdowns'", () => {
    expect(adminSettingsKeys.dropdowns()).toEqual(["admin-settings", "dropdowns"]);
  });

  // ── dropdownsByModule ─────────────────────────────────────────────────────

  it("dropdownsByModule includes module and defaults category to 'all'", () => {
    expect(adminSettingsKeys.dropdownsByModule("employees")).toEqual([
      "admin-settings",
      "dropdowns",
      "employees",
      "all",
    ]);
  });

  it("dropdownsByModule includes explicit category when provided", () => {
    expect(adminSettingsKeys.dropdownsByModule("employees", "hire_type")).toEqual([
      "admin-settings",
      "dropdowns",
      "employees",
      "hire_type",
    ]);
  });

  it("dropdownsByModule keys differ for different modules", () => {
    expect(adminSettingsKeys.dropdownsByModule("employees")).not.toEqual(
      adminSettingsKeys.dropdownsByModule("assets"),
    );
  });

  it("dropdownsByModule keys differ for different categories", () => {
    expect(adminSettingsKeys.dropdownsByModule("employees", "hire_type")).not.toEqual(
      adminSettingsKeys.dropdownsByModule("employees", "department"),
    );
  });

  // ── dropdownOptionsAll ────────────────────────────────────────────────────

  it("dropdownOptionsAll extends all with 'dropdown-options'", () => {
    expect(adminSettingsKeys.dropdownOptionsAll()).toEqual([
      "admin-settings",
      "dropdown-options",
    ]);
  });

  it("dropdownOptionsAll is distinct from dropdowns key", () => {
    expect(adminSettingsKeys.dropdownOptionsAll()).not.toEqual(adminSettingsKeys.dropdowns());
  });

  // ── dropdownOptions ───────────────────────────────────────────────────────

  it("dropdownOptions includes module and defaults category to 'all'", () => {
    expect(adminSettingsKeys.dropdownOptions("employees")).toEqual([
      "admin-settings",
      "dropdown-options",
      "employees",
      "all",
    ]);
  });

  it("dropdownOptions includes explicit category when provided", () => {
    expect(adminSettingsKeys.dropdownOptions("employees", "department")).toEqual([
      "admin-settings",
      "dropdown-options",
      "employees",
      "department",
    ]);
  });

  it("dropdownOptions shares dropdownOptionsAll as its prefix", () => {
    const optionsKey = adminSettingsKeys.dropdownOptions("employees");
    const allOptionsKey = adminSettingsKeys.dropdownOptionsAll();
    expect(optionsKey.slice(0, allOptionsKey.length)).toEqual(allOptionsKey);
  });

  it("dropdownOptions and dropdownsByModule are distinct for the same arguments", () => {
    expect(adminSettingsKeys.dropdownOptions("employees", "hire_type")).not.toEqual(
      adminSettingsKeys.dropdownsByModule("employees", "hire_type"),
    );
  });

  // ── Prefix matching ───────────────────────────────────────────────────────

  it("all generated keys start with the 'admin-settings' root", () => {
    const root = adminSettingsKeys.all[0];
    expect(adminSettingsKeys.dropdowns()[0]).toBe(root);
    expect(adminSettingsKeys.dropdownsByModule("x")[0]).toBe(root);
    expect(adminSettingsKeys.dropdownOptionsAll()[0]).toBe(root);
    expect(adminSettingsKeys.dropdownOptions("x")[0]).toBe(root);
  });
});
