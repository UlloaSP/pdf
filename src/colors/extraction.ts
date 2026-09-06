export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 12_000_000;
export interface ImageSize {
  width: number;
  height: number;
  format: "PNG" | "JPEG" | "WEBP";
}
export function inspectImage(bytes: Uint8Array): ImageSize {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES)
    throw new Error("La imagen debe ocupar entre 1 byte y 15 MiB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, count: number) =>
    String.fromCharCode(...bytes.subarray(start, start + count));
  let result: ImageSize | undefined;
  if (
    bytes.length >= 33 &&
    bytes[0] === 137 &&
    text(1, 7) === "PNG\r\n\x1a\n" &&
    text(12, 4) === "IHDR"
  ) {
    result = { width: view.getUint32(16), height: view.getUint32(20), format: "PNG" };
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = view.getUint32(offset);
      if (offset + length + 12 > bytes.length) throw new Error("PNG truncado.");
      const type = text(offset + 4, 4);
      if (type === "acTL") throw new Error("Usa una imagen estática; APNG no está admitido.");
      if (type === "IDAT") break;
      offset += length + 12;
    }
  } else if (bytes.length >= 12 && text(0, 4) === "RIFF" && text(8, 4) === "WEBP") {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const type = text(offset, 4),
        size = view.getUint32(offset + 4, true),
        at = offset + 8;
      if (at + size > bytes.length) throw new Error("WEBP truncado.");
      const uint24 = (p: number) => bytes[p] + bytes[p + 1] * 256 + bytes[p + 2] * 65536;
      if (type === "VP8X" && size >= 10) {
        if (bytes[at] & 2) throw new Error("Usa un WEBP estático.");
        result = { width: uint24(at + 4) + 1, height: uint24(at + 7) + 1, format: "WEBP" };
        break;
      }
      if (
        type === "VP8 " &&
        size >= 10 &&
        bytes[at + 3] === 157 &&
        bytes[at + 4] === 1 &&
        bytes[at + 5] === 42
      ) {
        result = {
          width: view.getUint16(at + 6, true) & 16383,
          height: view.getUint16(at + 8, true) & 16383,
          format: "WEBP",
        };
        break;
      }
      if (type === "VP8L" && size >= 5 && bytes[at] === 47) {
        const bits = view.getUint32(at + 1, true);
        result = { width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1, format: "WEBP" };
        break;
      }
      offset = at + size + (size % 2);
    }
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) throw new Error("Cabecera JPEG inválida.");
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const size = view.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) throw new Error("JPEG truncado.");
      if (
        [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) &&
        size >= 8
      ) {
        result = {
          height: view.getUint16(offset + 3),
          width: view.getUint16(offset + 5),
          format: "JPEG",
        };
        break;
      }
      offset += size;
    }
  }
  if (!result)
    throw new Error("Selecciona PNG, JPG o WEBP estático válido. SVG y GIF no están admitidos.");
  if (
    !result.width ||
    !result.height ||
    result.width > 16384 ||
    result.height > 16384 ||
    result.width * result.height > MAX_IMAGE_PIXELS
  )
    throw new Error("Máximo 12 megapíxeles y 16384 píxeles por lado.");
  return result;
}
export interface PaletteColor {
  hex: string;
  share: number;
}
export const rgbHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
export function extractPalette(data: Uint8ClampedArray, count = 8): PaletteColor[] {
  if (data.length % 4 || count < 1 || count > 16 || !Number.isInteger(count))
    throw new Error("Muestra o número de colores inválido.");
  const bins = new Map<number, { weight: number; r: number; g: number; b: number }>();
  const step = Math.max(1, Math.ceil(data.length / 4 / 65536)) * 4;
  let total = 0;
  for (let i = 0; i < data.length; i += step) {
    const [r, g, b, a] = data.subarray(i, i + 4);
    if (!a) continue;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bin = bins.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 };
    bin.weight += a;
    bin.r += r * a;
    bin.g += g * a;
    bin.b += b * a;
    bins.set(key, bin);
    total += a;
  }
  return [...bins.entries()]
    .sort((a, b) => b[1].weight - a[1].weight || a[0] - b[0])
    .slice(0, count)
    .map(([, bin]) => ({
      hex: rgbHex(bin.r / bin.weight, bin.g / bin.weight, bin.b / bin.weight),
      share: bin.weight / total,
    }));
}
export function pixelCoordinate(client: number, start: number, display: number, pixels: number) {
  return Math.max(0, Math.min(pixels - 1, Math.floor(((client - start) / display) * pixels)));
}
export function serializePalette(palette: PaletteColor[], format: "json" | "css") {
  return format === "json"
    ? `${JSON.stringify({ colorSpace: "sRGB", method: "sampled-alpha-weighted-5bit-bins", colors: palette }, null, 2)}\n`
    : `:root {\n${palette.map((item, index) => `  --color-${index + 1}: ${item.hex};`).join("\n")}\n}\n`;
}
