// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Workspace } from "../src/Workspace";
import { defaultSettings } from "../src/appSettings";
import type { Feature } from "../src/features";

const bridge = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn(), isTauri: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: bridge.invoke, isTauri: bridge.isTauri }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: bridge.open }));

const feature: Feature = {
  id: "example",
  name: "Ejemplo",
  description: "Opciones de prueba",
  category: "Edición",
  extensions: ["png"],
  multiple: true,
  requirements: [],
  fields: [
    { key: "ratio", label: "Proporción", type: "checkbox", default: false },
    { key: "mode", label: "Modo", type: "select", options: ["A", "B"], default: "A" },
    { key: "size", label: "Tamaño", type: "number", default: 25 },
    { key: "text", label: "Texto", type: "textarea", default: "Inicial" },
  ],
};
let container: HTMLDivElement;
let root: Root;
const onBusyChange = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  bridge.isTauri.mockReturnValue(true);
  bridge.open.mockResolvedValue(["C:/one.png", "C:/two.png"]);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(locked = false) {
  await act(async () =>
    root.render(
      <Workspace
        feature={feature}
        settings={{ ...defaultSettings, defaultOutputDir: "C:/out" }}
        locked={locked}
        onClose={vi.fn()}
        onBusyChange={onBusyChange}
        onRememberDestination={vi.fn()}
      />,
    ),
  );
}
function button(text: string): HTMLButtonElement {
  const element = [...container.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === text || item.getAttribute("aria-label") === text,
  );
  if (!element) throw new Error(`Missing button: ${text}`);
  return element;
}
async function click(element: HTMLElement) {
  await act(async () => element.click());
}
function control<T extends HTMLElement>(selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) throw new Error(`Missing control: ${selector}`);
  return element;
}
async function change(
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
) {
  const prototype =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLSelectElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (!descriptor?.set) throw new Error("Missing value setter");
  await act(async () => {
    descriptor.set?.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }),
    );
  });
}

it("preserves typed options and selected file order, then locks controls while the native job runs", async () => {
  let finish!: (value: { ok: boolean; outputs: string[]; error: null }) => void;
  bridge.invoke.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render();
  await click(button("Seleccionar archivos"));
  await click(button("Subir archivo 2"));
  await click(control('[role="checkbox"]'));
  await change(control<HTMLSelectElement>("select"), "B");
  await change(control<HTMLInputElement>('input[type="number"]'), "12.5");
  await change(control<HTMLTextAreaElement>("textarea"), "Texto editado");
  await click(button("Ejecutar Ejemplo"));
  expect(bridge.invoke).toHaveBeenCalledWith("run_tool", {
    request: {
      feature: "example",
      inputs: ["C:/two.png", "C:/one.png"],
      output_dir: "C:/out",
      options: { ratio: true, mode: "B", size: 12.5, text: "Texto editado" },
    },
  });
  expect(onBusyChange).toHaveBeenLastCalledWith(true);
  expect(control<HTMLButtonElement>('[role="checkbox"]').disabled).toBe(true);
  expect(button("Volver al catálogo").disabled).toBe(true);
  await click(button("Ejecutar Ejemplo"));
  expect(bridge.invoke).toHaveBeenCalledTimes(1);
  await act(async () => finish({ ok: true, outputs: ["C:/out/result.png"], error: null }));
  expect(onBusyChange).toHaveBeenLastCalledWith(false);
  expect(container.textContent).toContain("C:/out/result.png");
  expect(control<HTMLInputElement>('input[type="number"]').value).toBe("12.5");
});

it("blocks Radix checkboxes and native calls in browser mode and while locked", async () => {
  bridge.isTauri.mockReturnValue(false);
  await render();
  expect(container.textContent).toContain("aplicación de escritorio");
  expect(control<HTMLButtonElement>('[role="checkbox"]').disabled).toBe(true);
  await click(button("Seleccionar archivos"));
  await click(button("Ejecutar Ejemplo"));
  expect(bridge.open).not.toHaveBeenCalled();
  expect(bridge.invoke).not.toHaveBeenCalled();
  bridge.isTauri.mockReturnValue(true);
  await render(true);
  expect(control<HTMLButtonElement>('[role="checkbox"]').disabled).toBe(true);
  expect(button("Elegir carpeta de destino").disabled).toBe(true);
});

it("requires confirmation before invoking cancellation", async () => {
  let finish!: (value: { ok: boolean; outputs: string[]; error: string }) => void;
  bridge.invoke.mockImplementation((command: string) =>
    command === "run_tool"
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(),
  );
  await render();
  await click(button("Ejecutar Ejemplo"));
  await click(button("Cancelar"));
  const dialog = document.querySelector('[role="alertdialog"]');
  expect(dialog?.textContent).toContain("¿Cancelar el procesamiento actual?");
  expect(bridge.invoke).toHaveBeenCalledTimes(1);
  const confirm = [...(dialog?.querySelectorAll("button") ?? [])].find(
    (item) => item.textContent === "Cancelar procesamiento",
  );
  if (!confirm) throw new Error("Missing cancellation confirmation");
  await click(confirm);
  expect(bridge.invoke).toHaveBeenLastCalledWith("cancel_job");
  await act(async () => finish({ ok: false, outputs: [], error: "Cancelado" }));
  expect(container.textContent).toContain("Cancelado");
  expect(onBusyChange).toHaveBeenLastCalledWith(false);
});
