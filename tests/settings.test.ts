import { describe, expect, it } from "vite-plus/test";
import { defaultSettings, shortcutFor, validateSettings } from "../src/appSettings";

describe("saved preferences", () => {
  it("recovers missing and malformed preferences without sharing defaults", () => {
    const settings = validateSettings(null);
    settings.shortcuts.search = "Alt+K";
    expect(defaultSettings.shortcuts.search).toBe("Ctrl+K");
    expect(validateSettings({ scheme: "invalid", fontSize: "huge" })).toEqual(defaultSettings);
  });
  it("keeps valid values and constrains layout and polling inputs", () => {
    expect(
      validateSettings({
        scheme: "dark",
        fontSize: 99,
        animationMs: -10,
        contrast: NaN,
        updateIntervalHours: 0,
      }),
    ).toMatchObject({
      scheme: "dark",
      fontSize: 18,
      animationMs: 0,
      contrast: 100,
      updateIntervalHours: 6,
    });
  });
  it("rejects duplicate bindings and bare characters", () => {
    expect(validateSettings({ shortcuts: { search: "Ctrl+," } }).shortcuts).toEqual(
      defaultSettings.shortcuts,
    );
    expect(
      validateSettings({ shortcuts: { search: "K", settings: "Alt+S" } }).shortcuts,
    ).toMatchObject({ search: "Ctrl+K", settings: "Alt+S" });
  });
  it("matches explicit modifiers and normalizes shifted letters", () => {
    expect(
      shortcutFor({ key: "h", ctrlKey: true, altKey: false, shiftKey: true, metaKey: false }),
    ).toBe("Ctrl+Shift+H");
    expect(
      shortcutFor({
        key: "Control",
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe("");
  });
});
