// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  contrastChecks,
  contrastRatio,
  simulateVision,
  visionModes,
} from "../src/colors/accessibility";
import { Accessibility } from "../src/colors/tools/accessibility";
let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  host?.remove();
});

it("uses exact WCAG thresholds without rounding a failing value up", () => {
  expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 8);
  expect(contrastRatio("#555", "#555")).toBe(1);
  expect(contrastRatio("#123456", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#123456"), 10);
  expect(contrastChecks(4.49999).aa).toBe(false);
  expect(contrastChecks(4.5).aa).toBe(true);
  expect(contrastChecks(2.99999).aaLarge).toBe(false);
  expect(contrastChecks(7).aaa).toBe(true);
  expect(() => contrastRatio("red", "#fff")).toThrow();
});

it("linearizes sRGB before applying published Machado rows", () => {
  // Red, full deuteranopia: linear [0.367322, 0.280085, -0.01182], clipped and encoded.
  expect(simulateVision("#ff0000", "deuteranopia")).toBe("#a39000");
  expect(simulateVision("#ff0000", "protanopia")).toBe("#6d5f00");
  expect(simulateVision("#ff0000", "achromatopsia")).toBe("#7f7f7f");
  expect(simulateVision("#ff0000", "deuteranomaly")).not.toBe(
    simulateVision("#ff0000", "deuteranopia"),
  );
  for (const [mode] of visionModes) {
    expect(simulateVision("#000", mode)).toBe("#000000");
    expect(simulateVision("#fff", mode)).toBe("#ffffff");
    expect(simulateVision("#3289ed", mode)).toMatch(/^#[0-9a-f]{6}$/);
  }
  expect(() => simulateVision("#oops", "protanopia")).toThrow();
});

it("renders eight selectable samples and preserves the last valid contrast background", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const change = vi.fn();
  await act(async () => root?.render(<Accessibility color="#ff0000" onColorChange={change} />));
  const buttons = host.querySelectorAll("button");
  expect(buttons.length).toBe(8);
  await act(async () => buttons[0].click());
  expect(change).toHaveBeenCalledWith("#7f7f7f");
  const input = host.querySelector<HTMLInputElement>("#contrast-background-hex")!;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!;
  await act(async () => {
    descriptor.set!.call(input, "#000");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const ratio = host.querySelector('[role="status"]')!.textContent;
  await act(async () => {
    descriptor.set!.call(input, "bad");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(host.querySelector('[role="status"]')!.textContent).toBe(ratio);
});
