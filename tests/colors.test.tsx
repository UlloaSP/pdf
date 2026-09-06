// @vitest-environment jsdom
import { afterEach, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Colors } from "../src/colors/Colors";
import { normalizeHex } from "../src/colors/hex";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
});

it("normalizes sRGB hex and rejects alpha, incomplete and injected values", () => {
  expect(normalizeHex(" #AbC ")).toBe("#aabbcc");
  expect(normalizeHex("#ABCDEF")).toBe("#abcdef");
  for (const value of ["", "abc", "#ab", "#abcdef00", "red", "url(x)"])
    expect(normalizeHex(value)).toBeNull();
});

it("keeps the last valid shared color when editing an invalid HEX", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<Colors searchRef={null} query="" onQueryChange={() => {}} />),
  );
  const input = container.querySelector<HTMLInputElement>("#colors-hex")!;
  const picker = container.querySelector<HTMLInputElement>("#colors-picker")!;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!;
  async function change(value: string) {
    await act(async () => {
      descriptor.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  await change("#F00");
  expect(picker.value).toBe("#ff0000");
  await change("#oops");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(picker.value).toBe("#ff0000");
  expect(container.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("#ff0000");
});
