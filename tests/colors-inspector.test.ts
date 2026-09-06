import { expect, it } from "vite-plus/test";
import {
  adjustHsl,
  cssNames,
  formatCoordinate,
  inspectColor,
  parseInspectorInput,
} from "../src/colors/inspector";

it("matches the reference RGB, numeric, Android, HSL, CMYK and luminance vector", () => {
  const result = inspectColor("#635dd7");
  expect(result.bytes).toEqual([99, 93, 215]);
  expect(result.decimal).toBe(6512087);
  expect(result.binary).toBe("01100011 01011101 11010111");
  expect(result.androidHex).toBe("#ff635dd7");
  expect(result.androidSigned).toBe(-10265129);
  expect(result.hsl[0]).toBeCloseTo(242.950819672, 6);
  expect(result.hsl[1]).toBeCloseTo(60.396039604, 6);
  expect(result.cmyk[0]).toBeCloseTo(0.5395348837, 8);
  expect(result.cmyk[1]).toBeCloseTo(0.5674418605, 8);
  expect(result.cmyk[2]).toBe(0);
  expect(result.cmyk[3]).toBeCloseTo(0.1568627451, 8);
  expect(result.lrv).toBeCloseTo(15.3872686589, 7);
  expect(result.websafe).toBe("#6666cc");
  expect(result.spaces).toHaveLength(51);
  for (const id of [
    "cam16-jmh",
    "hsluv",
    "luv",
    "lchuv",
    "okhsl",
    "okhsv",
    "oklab",
    "xyz-d50",
    "rec2100pq",
  ])
    expect(result.spaces.find((space) => space.id === id)?.coordinates).toHaveLength(3);
});

it("handles black, white and achromatic coordinates without fictional finite hues", () => {
  expect(inspectColor("#000").cmyk).toEqual([0, 0, 0, 1]);
  expect(inspectColor("#fff").cmyk).toEqual([0, 0, 0, 0]);
  expect(inspectColor("#fff").lrv).toBeCloseTo(100, 10);
  expect(inspectColor("#000").lrv).toBe(0);
  expect(formatCoordinate(inspectColor("#808080").hsl[0])).toBe("—");
  expect(formatCoordinate(null)).toBe("—");
  expect(formatCoordinate(Number.NaN)).toBe("—");
  expect(adjustHsl("#808080", 1, 100)).toMatch(/^#[0-9a-f]{6}$/);
  expect(adjustHsl("#ff0000", 0, 120)).toBe("#00ff00");
  expect(() => adjustHsl("#ff0000", 1, 101)).toThrow();
});

it("parses named/CSS colors, explicitly maps wide gamut, and rejects ambiguous alpha/components", () => {
  expect(parseInspectorInput("RED")).toEqual({ hex: "#ff0000", mapped: false });
  expect(parseInspectorInput("rgb(99 93 215)").hex).toBe("#635dd7");
  expect(parseInspectorInput("color(display-p3 0 1 0)").mapped).toBe(true);
  for (const invalid of [
    "",
    "var(--x)",
    "currentColor",
    "url(x)",
    "transparent",
    "rgb(1 2 3 / 0.5)",
    "oklab(none 0 0)",
    "x".repeat(501),
  ])
    expect(() => parseInspectorInput(invalid)).toThrow();
  expect(() => inspectColor("red")).toThrow();
});

it("exposes all CSS names with aliases, exact matches and usable CSS declarations", () => {
  expect(cssNames).toHaveLength(148);
  expect(inspectColor("#00ffff").exactNames).toEqual(["aqua", "cyan"]);
  expect(inspectColor("#663399").exactNames).toEqual(["rebeccapurple"]);
  const red = inspectColor("#ff0000");
  expect(red.nearest.delta).toBeCloseTo(0, 10);
  expect(red.css).toContain("color: #ff0000;");
  expect(red.css.some((value) => value.includes("oklch("))).toBe(true);
});
