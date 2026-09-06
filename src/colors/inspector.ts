import Color from "colorjs.io";
import keywords from "colorjs.io/src/keywords.js";
import { normalizeHex } from "./hex";

export const cssNames = Object.keys(keywords).sort();
export const formatCoordinate = (value: number | null): string =>
  value === null || !Number.isFinite(value) ? "—" : String(Number(value.toFixed(6)));

export function parseInspectorInput(input: string) {
  if (input.length > 500) throw new Error("El color es demasiado largo.");
  let color: Color;
  try {
    color = new Color(input.trim());
  } catch {
    throw new Error(
      "Introduce un color CSS válido, por ejemplo red, #635dd7 u oklch(60% 0.2 280).",
    );
  }
  if (color.alpha !== 1 || color.coords.some((value) => value === null || !Number.isFinite(value)))
    throw new Error(
      "Usa un color opaco con todos sus componentes definidos; esta biblioteca comparte colores sin transparencia.",
    );
  const mapped = !color.inGamut("srgb");
  const rgb = color.to("srgb");
  if (mapped) rgb.toGamut({ method: "css" });
  return { hex: rgb.toString({ format: "hex", collapse: false }), mapped };
}

export function inspectColor(hex: string) {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error("El inspector necesita un color HEX sRGB válido.");
  const color = new Color(normalized);
  const bytes = [1, 3, 5].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
  const [r, g, b] = bytes;
  const decimal = r * 65536 + g * 256 + b;
  const rgb = bytes.map((value) => value / 255);
  const maximum = Math.max(...rgb);
  const cmy = rgb.map((value) => 1 - value);
  const cmyk = [
    ...rgb.map((value) => (maximum === 0 ? 0 : (maximum - value) / maximum)),
    1 - maximum,
  ];
  const websafe = `#${bytes.map((value) => (Math.round(value / 51) * 51).toString(16).padStart(2, "0")).join("")}`;
  const exactNames = cssNames.filter((name) =>
    keywords[name].every((value, index) => Math.round(value * 255) === bytes[index]),
  );
  const nearest = cssNames
    .map((name) => ({ name, delta: color.deltaE(new Color(name), "2000") }))
    .sort((a, b) => a.delta - b.delta || a.name.localeCompare(b.name))[0];
  const spaces = Color.Space.all.map((space) => {
    const converted = color.to(space);
    return {
      id: space.id,
      name: space.name,
      inGamut: converted.inGamut(),
      coordinates: Object.entries(space.coords).map(([id, metadata], index) => ({
        id,
        name: metadata.name ?? id,
        value: converted.coords[index],
        range: metadata.range ?? metadata.refRange,
      })),
    };
  });
  return {
    hex: normalized,
    bytes,
    decimal,
    binary: bytes.map((value) => value.toString(2).padStart(8, "0")).join(" "),
    androidHex: `#ff${normalized.slice(1)}`,
    androidSigned: 0xff000000 | decimal,
    cmy,
    cmyk,
    websafe,
    exactNames,
    nearest,
    spaces,
    hsl: color.to("hsl").coords,
    lrv: color.luminance * 100,
    css: [
      `color: ${normalized};`,
      `background-color: ${normalized};`,
      `border-color: ${normalized};`,
      `--color: ${normalized};`,
      `color: ${color.to("hsl").toString({ precision: 6, inGamut: false })};`,
      `color: ${color.to("oklch").toString({ precision: 6, inGamut: false })};`,
      `color: ${color.to("lab").toString({ precision: 6, inGamut: false })};`,
      `color: ${color.to("p3").toString({ precision: 6, inGamut: false })};`,
    ],
  };
}

export function adjustHsl(hex: string, coordinate: number, value: number) {
  if (
    ![0, 1, 2].includes(coordinate) ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > (coordinate === 0 ? 360 : 100)
  )
    throw new Error("Valor HSL fuera de rango.");
  const color = new Color(hex).to("hsl");
  if (color.coords[0] === null || !Number.isFinite(color.coords[0])) color.coords[0] = 0;
  color.coords[coordinate] = value;
  return color.to("srgb").toString({ format: "hex", collapse: false });
}
