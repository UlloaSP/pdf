import { describe, expect, it } from "vite-plus/test";
import Color from "colorjs.io";
import {
  harmony,
  harmonyOffsets,
  gradient,
  variation,
  parsePalettes,
  storePalettes,
  exportPalette,
  paletteStorageKey,
  toHex,
} from "../src/colors/harmonies";

describe("HSL harmonies", () => {
  it("matches the primary hue wheel", () => {
    expect(harmony("#ff0000", "complementary")).toEqual(["#ff0000", "#00ffff"]);
    expect(harmony("#ff0000", "triadic")).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
    expect(harmony("#ff0000", "square")).toEqual(["#ff0000", "#80ff00", "#00ffff", "#8000ff"]);
  });
  it("wraps analogous angles and preserves achromatic colors", () => {
    expect(harmony("#ff0000", "analogous")).toEqual(["#ff0080", "#ff0000", "#ff8000"]);
    for (const kind of Object.keys(harmonyOffsets) as (keyof typeof harmonyOffsets)[])
      for (const hex of ["#000000", "#808080", "#ffffff"])
        expect(harmony(hex, kind)).toEqual(harmonyOffsets[kind].map(() => hex));
  });
  it("round-trips 8-bit sRGB samples", () => {
    for (const hex of ["#635dd7", "#010203", "#fafbfc", "#ab00ef", "#343434"])
      expect(toHex(new Color(hex).to("hsl"))).toBe(hex);
    expect(() => harmony("url(test)", "triadic")).toThrow();
  });
});

describe("variations and gradients", () => {
  it("has exact endpoints in both spaces and different perceptual midpoint", () => {
    for (const space of ["oklab", "srgb"] as const) {
      const values = gradient("#ff0000", "#0000ff", 20, space);
      expect(values).toHaveLength(20);
      expect(values[0]).toBe("#ff0000");
      expect(values.at(-1)).toBe("#0000ff");
    }
    expect(gradient("#000000", "#ffffff", 3, "srgb")[1]).toBe("#808080");
    expect(gradient("#000000", "#ffffff", 3, "oklab")[1]).toBe("#636363");
    for (const count of [1, 21, 2.5, NaN, Infinity])
      expect(() => gradient("#000", "#fff", count, "srgb")).toThrow();
  });
  it("mixes toward black, white and neutral gray without mutating source", () => {
    expect(variation("#635dd7", "shades").at(-1)).toBe("#000000");
    expect(variation("#635dd7", "tints").at(-1)).toBe("#ffffff");
    expect(variation("#635dd7", "tones").at(-1)).toBe("#808080");
    expect(variation("#635dd7", "lightness")[0]).toBe("#000000");
    expect(variation("#635dd7", "lightness").at(-1)).toBe("#ffffff");
    for (const hex of variation("#000000", "saturation")) expect(hex).toBe("#000000");
  });
});

describe("bounded local palettes", () => {
  const palette = { id: "test-1", name: "Prueba", colors: ["#F00", "#ffffff"] };
  it("stores normalized palettes and reads them back", () => {
    const data = new Map<string, string>();
    storePalettes(
      {
        setItem: (key, value) => {
          data.set(key, value);
        },
      },
      [palette],
    );
    expect(parsePalettes(data.get(paletteStorageKey)!)).toEqual([
      { ...palette, colors: ["#ff0000", "#ffffff"] },
    ]);
    expect(parsePalettes(null)).toEqual([]);
  });
  it("rejects corrupt data, excessive collections, duplicate IDs and CSS injection", () => {
    const bad = [
      "not json",
      "{}",
      JSON.stringify([palette, palette]),
      JSON.stringify([{ ...palette, colors: ["red", "url(x)"] }]),
      JSON.stringify([{ ...palette, name: "x".repeat(65) }]),
      JSON.stringify([{ ...palette, colors: Array(21).fill("#000") }]),
      JSON.stringify(Array.from({ length: 21 }, (_, index) => ({ ...palette, id: `id-${index}` }))),
    ];
    for (const raw of bad) expect(() => parsePalettes(raw)).toThrow();
  });
  it("propagates storage failures for the UI and exports safe CSS/JSON", () => {
    expect(() =>
      storePalettes(
        {
          setItem: () => {
            throw new Error("QuotaExceeded");
          },
        },
        [palette],
      ),
    ).toThrow("QuotaExceeded");
    const name = "</style>{evil}";
    const css = exportPalette(name, palette.colors, "css");
    expect(css).toBe(":root {\n  --palette-1: #ff0000;\n  --palette-2: #ffffff;\n}");
    expect(JSON.parse(exportPalette(name, palette.colors, "json"))).toEqual({
      version: 1,
      name,
      space: "srgb",
      colors: ["#ff0000", "#ffffff"],
    });
  });
});
