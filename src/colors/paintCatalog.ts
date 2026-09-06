import Color from "colorjs.io";
import { normalizeHex } from "./hex";

export interface Paint {
  brand: string;
  name: string;
  hex: string;
}
export interface PaintMatch extends Paint {
  delta: number;
}
export const catalogLimit = 10000;
export function parseCatalog(text: string): Paint[] {
  if (text.length > 2_000_000) throw new Error("El catálogo supera 2 MB.");
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data) || !data.length || data.length > catalogLimit)
    throw new Error("El JSON debe ser una lista de 1 a 10.000 pinturas.");
  const seen = new Set<string>();
  const paints = data.map((entry: unknown, index) => {
    if (!entry || typeof entry !== "object") throw new Error(`Pintura ${index + 1} inválida.`);
    const item = entry as Record<string, unknown>;
    const hex = typeof item.hex === "string" ? normalizeHex(item.hex) : null;
    if (
      !hex ||
      typeof item.brand !== "string" ||
      !item.brand.trim() ||
      item.brand.length > 120 ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 200
    )
      throw new Error(`Pintura ${index + 1}: necesita brand, name y hex válidos.`);
    const paint = { brand: item.brand.trim(), name: item.name.trim(), hex };
    const key = JSON.stringify(paint);
    if (seen.has(key)) throw new Error(`Pintura ${index + 1} duplicada.`);
    seen.add(key);
    return paint;
  });
  if (new TextEncoder().encode(JSON.stringify(paints)).byteLength > 2_000_000)
    throw new Error("El catálogo normalizado supera 2 MB.");
  return paints;
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function matchCatalog(
  paints: Paint[],
  hex: string,
  brand: string,
  query: string,
  maxDelta: number,
): PaintMatch[] {
  const source = new Color(hex);
  return paints
    .filter(
      (paint) =>
        (!brand || paint.brand === brand) &&
        normalize(`${paint.name} ${paint.brand} ${paint.hex}`).includes(normalize(query.trim())),
    )
    .map((paint) => ({ ...paint, delta: source.deltaE(new Color(paint.hex), "2000") }))
    .filter((paint) => paint.delta <= maxDelta)
    .sort((a, b) => a.delta - b.delta || a.name.localeCompare(b.name, "es"));
}
export function distribution(paints: Paint[]): {
  hue: number[];
  saturation: number[];
  lightness: number[];
} {
  const result = {
    hue: Array<number>(12).fill(0),
    saturation: Array<number>(10).fill(0),
    lightness: Array<number>(10).fill(0),
  };
  for (const paint of paints) {
    const [h, s, l] = new Color(paint.hex).to("hsl").coords;
    if (h !== null && Number.isFinite(h) && (s ?? 0) > 0.0001)
      result.hue[Math.min(11, Math.floor((((h % 360) + 360) % 360) / 30))]!++;
    result.saturation[Math.min(9, Math.max(0, Math.floor((s ?? 0) / 10)))]!++;
    result.lightness[Math.min(9, Math.max(0, Math.floor((l ?? 0) / 10)))]!++;
  }
  return result;
}
