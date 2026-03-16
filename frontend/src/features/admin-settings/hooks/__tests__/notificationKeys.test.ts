import { describe, it, expect } from "vitest";
import { notificationKeys } from "../notificationKeys";

describe("notificationKeys", () => {
  it("all is a stable tuple containing 'notification-settings'", () => {
    expect(notificationKeys.all).toEqual(["notification-settings"]);
  });

  it("settings extends all with 'global'", () => {
    expect(notificationKeys.settings()).toEqual(["notification-settings", "global"]);
  });

  it("toggles extends all with 'toggles'", () => {
    expect(notificationKeys.toggles()).toEqual(["notification-settings", "toggles"]);
  });

  it("settings and toggles keys are distinct", () => {
    expect(notificationKeys.settings()).not.toEqual(notificationKeys.toggles());
  });

  it("both settings and toggles share the notification-settings prefix", () => {
    const root = notificationKeys.all[0];
    expect(notificationKeys.settings()[0]).toBe(root);
    expect(notificationKeys.toggles()[0]).toBe(root);
  });

  it("returns a new array each call with identical contents", () => {
    expect(notificationKeys.settings()).toEqual(notificationKeys.settings());
    expect(notificationKeys.settings()).not.toBe(notificationKeys.settings());
  });
});
