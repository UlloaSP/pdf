import Color from "colorjs.io";
import { normalizeHex } from "./hex";

export const harmonyOffsets = {
  complementary: [0, 180],
  analogous: [-30, 0, 30],
  split: [0, 150, 210],
  triadic: [0, 120, 240],
  square: [0, 90, 180, 270],
  tetradic: [0, 60, 180, 240],
} as const;
export type Harmony = keyof typeof harmonyOffsets;
export type Variation = "lightness" | "saturation" | "shades" | "tints" | "tones";
export interface SavedPalette {
  id: string;
  name: string;
  colors: string[];
}
export const paletteStorageKey = "pdf-utils.color-palettes.v1";
export const maxPalettes = 20;

function inputColor(hex: string): Color {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error("Código HEX inválido.");
  return new Color(normalized);
}
export function toHex(color: Color): string {
  const rgb = color.to("srgb").toGamut({ method: "clip" });
  return `#${rgb.coords
    .map((v) =>
      Math.round(Math.max(0, Math.min(1, v ?? 0)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
function hslValues(hex: string): [number, number, number] {
  const [h, s, l] = inputColor(hex).to("hsl").coords;
  // Achromatic colors have no hue. Zero keeps later saturation changes deterministic.
  return [Number.isFinite(h) ? h! : 0, s ?? 0, l ?? 0];
}
export function harmony(hex: string, kind: Harmony): string[] {
  const [h, s, l] = hslValues(hex);
  return harmonyOffsets[kind].map((offset) =>
    toHex(new Color("hsl", [(((h + offset) % 360) + 360) % 360, s, l])),
  );
}
export function gradient(
  start: string,
  end: string,
  steps: number,
  space: "oklab" | "srgb",
): string[] {
  if (!Number.isInteger(steps) || steps < 2 || steps > 20)
    throw new Error("Elige entre 2 y 20 pasos enteros.");
  const range = inputColor(start).range(inputColor(end), { space, outputSpace: "srgb" });
  return Array.from({ length: steps }, (_, index) => toHex(range(index / (steps - 1))));
}
export function variation(hex: string, kind: Variation): string[] {
  if (kind === "shades" || kind === "tints" || kind === "tones")
    return gradient(
      hex,
      kind === "shades" ? "#000000" : kind === "tints" ? "#ffffff" : "#808080",
      7,
      "srgb",
    );
  const [h, s, l] = hslValues(hex);
  return Array.from({ length: 7 }, (_, index) => {
    const value = (index * 100) / 6;
    return toHex(new Color("hsl", kind === "lightness" ? [h, s, value] : [h, value, l]));
  });
}
export function parsePalettes(raw: string | null): SavedPalette[] {
  if (raw === null) return [];
  if (raw.length > 100_000) throw new Error("El archivo local de paletas es demasiado grande.");
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > maxPalettes)
    throw new Error("Paletas guardadas inválidas.");
  const ids = new Set<string>();
  return data.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Paleta guardada inválida.");
    const record = entry as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(record.id) ||
      ids.has(record.id) ||
      typeof record.name !== "string" ||
      !record.name.trim() ||
      record.name.length > 64 ||
      !Array.isArray(record.colors) ||
      record.colors.length < 2 ||
      record.colors.length > 20
    )
      throw new Error("Paleta guardada inválida.");
    const colors = record.colors.map((value: unknown) =>
      typeof value === "string" ? normalizeHex(value) : null,
    );
    if (colors.some((value) => value === null))
      throw new Error("Una paleta contiene colores inválidos.");
    ids.add(record.id);
    return { id: record.id, name: record.name.trim(), colors: colors as string[] };
  });
}
export function storePalettes(storage: Pick<Storage, "setItem">, palettes: SavedPalette[]): void {
  const validated = parsePalettes(JSON.stringify(palettes));
  storage.setItem(paletteStorageKey, JSON.stringify(validated));
}
export function exportPalette(name: string, colors: string[], format: "json" | "css"): string {
  const palette = parsePalettes(JSON.stringify([{ id: "export", name, colors }]))[0]!;
  return format === "json"
    ? JSON.stringify(
        { version: 1, name: palette.name, space: "srgb", colors: palette.colors },
        null,
        2,
      )
    : `:root {\n${palette.colors.map((hex, index) => `  --palette-${index + 1}: ${hex};`).join("\n")}\n}`;
}
