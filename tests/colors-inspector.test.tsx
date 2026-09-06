// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import tool from "../src/colors/tools/inspector";

let root: Root;
let container: HTMLDivElement;
const changeColor = vi.fn();
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(<tool.Component color="#635dd7" onColorChange={changeColor} />),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function setInput(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!;
  await act(async () => {
    descriptor.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function apply() {
  const button = [...container.querySelectorAll("button")].find(
    (element) => element.textContent === "Aplicar color CSS",
  )!;
  await act(async () => button.click());
}
it("shows every conversion with labeled sliders and searchable coordinate cards", async () => {
  expect(container.textContent).toContain("Espacios de color · 51");
  expect(container.textContent).toContain("6512087");
  expect(container.querySelectorAll('[role="slider"]')).toHaveLength(3);
  for (const slider of container.querySelectorAll('[role="slider"]'))
    expect(document.getElementById(slider.getAttribute("aria-labelledby") ?? "")).not.toBeNull();
  await setInput("#inspector-space-filter", "CAM16");
  expect(container.textContent).toContain("CAM16-JMh");
  expect(
    [...container.querySelectorAll("button")].filter(
      (button) => button.textContent === "Copiar coordenadas",
    ),
  ).toHaveLength(1);
});
it("applies validated CSS colors and reports invalid inputs without changing the shared color", async () => {
  await setInput("#inspector-css", "red");
  await apply();
  expect(changeColor).toHaveBeenLastCalledWith("#ff0000");
  await setInput("#inspector-css", "url(https://example.com)");
  await apply();
  expect(changeColor).toHaveBeenCalledTimes(1);
  expect(container.querySelector("#inspector-css")?.getAttribute("aria-invalid")).toBe("true");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("color CSS válido");
});
