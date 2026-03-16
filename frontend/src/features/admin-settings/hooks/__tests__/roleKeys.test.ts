import { describe, it, expect } from "vitest";
import { roleKeys } from "../roleKeys";

describe("roleKeys", () => {
  // ── Base key ───────────────────────────────────────────────────────────────

  it("all is a stable tuple containing 'roles'", () => {
    expect(roleKeys.all).toEqual(["roles"]);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  it("list extends all with 'list'", () => {
    expect(roleKeys.list()).toEqual(["roles", "list"]);
  });

  it("list returns a new array each call but with identical contents", () => {
    expect(roleKeys.list()).toEqual(roleKeys.list());
    expect(roleKeys.list()).not.toBe(roleKeys.list());
  });

  // ── detail ────────────────────────────────────────────────────────────────

  it("detail includes the role id", () => {
    expect(roleKeys.detail("role_abc")).toEqual(["roles", "detail", "role_abc"]);
  });

  it("detail keys are unique for different ids", () => {
    expect(roleKeys.detail("role_a")).not.toEqual(roleKeys.detail("role_b"));
  });

  // ── permissions ───────────────────────────────────────────────────────────

  it("permissions includes the role id", () => {
    expect(roleKeys.permissions("role_abc")).toEqual(["roles", "permissions", "role_abc"]);
  });

  it("permissions key is distinct from detail key for same id", () => {
    expect(roleKeys.permissions("role_abc")).not.toEqual(roleKeys.detail("role_abc"));
  });

  // ── grantable ─────────────────────────────────────────────────────────────

  it("grantable includes the role id", () => {
    expect(roleKeys.grantable("role_abc")).toEqual(["roles", "grantable", "role_abc"]);
  });

  // ── assignments ───────────────────────────────────────────────────────────

  it("assignments includes the role id", () => {
    expect(roleKeys.assignments("role_abc")).toEqual(["roles", "assignments", "role_abc"]);
  });

  it("assignments key is distinct from grantable key for same id", () => {
    expect(roleKeys.assignments("role_abc")).not.toEqual(roleKeys.grantable("role_abc"));
  });

  // ── defaultPermissions ────────────────────────────────────────────────────

  it("defaultPermissions extends all with 'default-permissions'", () => {
    expect(roleKeys.defaultPermissions()).toEqual(["roles", "default-permissions"]);
  });

  it("defaultPermissions is distinct from list key", () => {
    expect(roleKeys.defaultPermissions()).not.toEqual(roleKeys.list());
  });

  // ── Prefix matching ───────────────────────────────────────────────────────

  it("all keys share the same 'roles' prefix", () => {
    const allKey = roleKeys.all[0];
    expect(roleKeys.list()[0]).toBe(allKey);
    expect(roleKeys.detail("x")[0]).toBe(allKey);
    expect(roleKeys.permissions("x")[0]).toBe(allKey);
    expect(roleKeys.grantable("x")[0]).toBe(allKey);
    expect(roleKeys.assignments("x")[0]).toBe(allKey);
    expect(roleKeys.defaultPermissions()[0]).toBe(allKey);
  });
});
