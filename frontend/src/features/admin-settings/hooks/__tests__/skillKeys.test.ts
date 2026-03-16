import { describe, it, expect } from "vitest";
import { skillKeys } from "../skillKeys";

describe("skillKeys", () => {
  it("all is a stable tuple containing 'skills'", () => {
    expect(skillKeys.all).toEqual(["skills"]);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  it("list with no params defaults to empty object", () => {
    expect(skillKeys.list()).toEqual(["skills", "list", {}]);
  });

  it("list with params includes the params object", () => {
    const params = { category: "Frontend", limit: 20 };
    expect(skillKeys.list(params)).toEqual(["skills", "list", params]);
  });

  it("list keys differ for different params", () => {
    expect(skillKeys.list({ category: "Frontend" })).not.toEqual(
      skillKeys.list({ category: "Backend" }),
    );
  });

  it("list returns a new array each call with identical contents", () => {
    expect(skillKeys.list()).toEqual(skillKeys.list());
    expect(skillKeys.list()).not.toBe(skillKeys.list());
  });

  // ── categories ────────────────────────────────────────────────────────────

  it("categories extends all with 'categories'", () => {
    expect(skillKeys.categories()).toEqual(["skills", "categories"]);
  });

  it("categories key is distinct from list key", () => {
    expect(skillKeys.categories()).not.toEqual(skillKeys.list());
  });

  it("categories returns a new array each call with identical contents", () => {
    expect(skillKeys.categories()).toEqual(skillKeys.categories());
    expect(skillKeys.categories()).not.toBe(skillKeys.categories());
  });

  // ── Prefix matching ───────────────────────────────────────────────────────

  it("all keys share the 'skills' prefix", () => {
    const root = skillKeys.all[0];
    expect(skillKeys.list()[0]).toBe(root);
    expect(skillKeys.categories()[0]).toBe(root);
  });
});
