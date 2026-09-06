import Color from "colorjs.io";
import { normalizeHex } from "./hex";

// Machado, Oliveira & Fernandes (2009), published matrices at severity 1 and 0.5.
// https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
const matrices = {
  protanopia: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998,
  ],
  protanomaly: [
    0.458064, 0.679578, -0.137642, 0.092785, 0.846313, 0.060902, -0.007494, -0.016807, 1.024301,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881,
  ],
  deuteranomaly: [
    0.547494, 0.607765, -0.155259, 0.181692, 0.781742, 0.036566, -0.01041, 0.027275, 0.983136,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039,
  ],
  tritanomaly: [
    1.017277, 0.027029, -0.044306, -0.006113, 0.958479, 0.047634, 0.006379, 0.248708, 0.744913,
  ],
};
export const visionModes = [
  ["achromatopsia", "Acromatopsia"],
  ["achromatomaly", "Acromatomalía · 50 %"],
  ["protanopia", "Protanopía"],
  ["deuteranopia", "Deuteranopía"],
  ["tritanopia", "Tritanopía"],
  ["protanomaly", "Protanomalía · 50 %"],
  ["deuteranomaly", "Deuteranomalía · 50 %"],
  ["tritanomaly", "Tritanomalía · 50 %"],
] as const;
export type VisionMode = (typeof visionModes)[number][0];
const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const encoded = (v: number) => {
  const clamped = Math.max(0, Math.min(1, v));
  return Math.round(
    255 * (clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055),
  );
};
export function simulateVision(color: string, mode: VisionMode): string {
  const hex = normalizeHex(color);
  if (!hex) throw new Error("Introduce un color HEX válido.");
  const rgb = [1, 3, 5].map((offset) => linear(parseInt(hex.slice(offset, offset + 2), 16) / 255));
  let output: number[];
  if (mode === "achromatopsia" || mode === "achromatomaly") {
    const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    output = rgb.map((value) => (mode === "achromatopsia" ? luminance : (value + luminance) / 2));
  } else {
    const matrix = matrices[mode];
    output = [0, 3, 6].map(
      (offset) =>
        matrix[offset] * rgb[0] + matrix[offset + 1] * rgb[1] + matrix[offset + 2] * rgb[2],
    );
  }
  return `#${output.map((value) => encoded(value).toString(16).padStart(2, "0")).join("")}`;
}
export function contrastChecks(ratio: number) {
  return { aa: ratio >= 4.5, aaLarge: ratio >= 3, aaa: ratio >= 7, aaaLarge: ratio >= 4.5 };
}
export function contrastRatio(foreground: string, background: string) {
  const fg = normalizeHex(foreground),
    bg = normalizeHex(background);
  if (!fg || !bg) throw new Error("Introduce dos colores HEX opacos válidos.");
  return new Color(fg).contrast(new Color(bg), "WCAG21");
}
