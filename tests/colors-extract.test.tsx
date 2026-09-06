// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  inspectImage,
  extractPalette,
  pixelCoordinate,
  serializePalette,
  MAX_FILE_BYTES,
} from "../src/colors/extraction";
import { imageFixtures } from "./color-image-fixtures";
import { Extract } from "../src/colors/tools/extract";
const bytes = (format: keyof typeof imageFixtures) =>
  Uint8Array.from(atob(imageFixtures[format]), (c) => c.charCodeAt(0));
let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  host?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("inspects actual Pillow generated PNG/JPEG/WEBP before decoding", () => {
  for (const format of ["PNG", "JPEG", "WEBP"] as const)
    expect(inspectImage(bytes(format))).toEqual({ width: 2, height: 3, format });
  expect(() => inspectImage(new TextEncoder().encode('<svg onload="x"/>'))).toThrow();
  expect(() => inspectImage(new Uint8Array(MAX_FILE_BYTES + 1))).toThrow();
  const png = bytes("PNG");
  new DataView(png.buffer).setUint32(16, 20_000);
  expect(() => inspectImage(png)).toThrow(/megapíxeles/);
  const jpeg = bytes("JPEG");
  expect(() => inspectImage(jpeg.subarray(0, 20))).toThrow();
  const webp = bytes("WEBP");
  new DataView(webp.buffer).setUint32(16, 99999, true);
  expect(() => inspectImage(webp)).toThrow(/truncado/);
});

it("rejects APNG animation before image decoder", () => {
  const original = bytes("PNG");
  const apng = new Uint8Array(original.length + 12);
  apng.set(original.subarray(0, 33));
  apng.set([0, 0, 0, 0, 97, 99, 84, 76, 0, 0, 0, 0], 33);
  apng.set(original.subarray(33), 45);
  expect(() => inspectImage(apng)).toThrow(/APNG/);
});

it("quantizes using alpha weights and excludes invisible RGB", () => {
  const data = new Uint8ClampedArray([
    255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 0,
  ]);
  const palette = extractPalette(data);
  expect(palette[0]).toEqual({ hex: "#ff0000", share: 2 / 3 });
  expect(palette[1]).toEqual({ hex: "#0000ff", share: 1 / 3 });
  expect(extractPalette(new Uint8ClampedArray([123, 45, 67, 0]))).toEqual([]);
  expect(extractPalette(new Uint8ClampedArray([248, 0, 0, 255, 255, 0, 0, 85]))[0].hex).toBe(
    "#fa0000",
  );
  expect(() => extractPalette(data, 17)).toThrow();
  expect(() => extractPalette(new Uint8ClampedArray(3))).toThrow();
});

it("maps scaled coordinates and exports deterministic JSON and CSS", () => {
  expect(pixelCoordinate(110, 10, 200, 100)).toBe(50);
  expect(pixelCoordinate(999, 10, 200, 100)).toBe(99);
  expect(pixelCoordinate(-1, 10, 200, 100)).toBe(0);
  const palette = [{ hex: "#123456", share: 1 }];
  expect(JSON.parse(serializePalette(palette, "json")).colors).toEqual(palette);
  expect(serializePalette(palette, "css")).toBe(":root {\n  --color-1: #123456;\n}\n");
});

it("loads locally, selects pixels by keyboard, exports, and releases the bitmap", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const close = vi.fn();
  const decode = vi.fn(async () => ({ width: 2, height: 3, close }));
  vi.stubGlobal("createImageBitmap", decode);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        drawImage: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray([255, 0, 0, 255]) }),
      }) as unknown as CanvasRenderingContext2D,
  );
  const change = vi.fn();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<Extract color="#123456" onColorChange={change} />));
  const file = new File([bytes("PNG")], "source.png", { type: "image/png" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes("PNG").buffer });
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  expect(decode).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
  const canvas = host.querySelector("canvas")!;
  await act(async () =>
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })),
  );
  expect(host.textContent).toContain("Píxel 1, 0");
  await act(async () =>
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  expect(change).toHaveBeenCalledWith("#ff0000");
  expect(host.querySelector('[aria-label="Usar color #ff0000"]')).not.toBeNull();
  const create = vi.fn(() => "blob:export");
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await act(async () =>
    [...host!.querySelectorAll("button")]
      .find((button) => button.textContent === "Exportar JSON")!
      .click(),
  );
  expect(create).toHaveBeenCalledOnce();
});

it("rejects invalid image before invoking the decoder", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const decode = vi.fn();
  vi.stubGlobal("createImageBitmap", decode);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<Extract color="#123456" onColorChange={() => {}} />));
  const file = new File(["<svg/>"], "bad.png");
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => new TextEncoder().encode("<svg/>").buffer,
  });
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { value: [file] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  expect(decode).not.toHaveBeenCalled();
  expect(host.textContent).toContain("SVG y GIF no están admitidos");
});
