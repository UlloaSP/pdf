import { useEffect, useState } from "react";

export interface AppSettings {
  scheme: "system" | "light" | "dark";
  palette: "graphite" | "iris" | "ocean" | "ember" | "grove";
  contrast: number;
  panelOpacity: number;
  animationMs: number;
  fontFamily: "Segoe UI" | "Calibri" | "Georgia";
  fontSize: number;
  defaultOutputDir: string;
  rememberOutputDir: boolean;
  confirmCancel: boolean;
  confirmClose: boolean;
  autoCheckUpdates: boolean;
  updateIntervalHours: 1 | 6 | 24;
  shortcuts: { search: string; settings: string; catalog: string };
}

export const defaultSettings: AppSettings = {
  scheme: "system",
  palette: "ember",
  contrast: 100,
  panelOpacity: 100,
  animationMs: 180,
  fontFamily: "Segoe UI",
  fontSize: 14,
  defaultOutputDir: "",
  rememberOutputDir: false,
  confirmCancel: true,
  confirmClose: true,
  autoCheckUpdates: true,
  updateIntervalHours: 6,
  shortcuts: { search: "Ctrl+K", settings: "Ctrl+,", catalog: "Ctrl+Shift+H" },
};

const storageKey = "pdf-utils.settings.v1";
export function validateSettings(value: unknown): AppSettings {
  const result = structuredClone(defaultSettings);
  if (!value || typeof value !== "object") return result;
  const input = value as Record<string, unknown>;
  for (const key of [
    "rememberOutputDir",
    "confirmCancel",
    "confirmClose",
    "autoCheckUpdates",
  ] as const) {
    if (typeof input[key] === "boolean") result[key] = input[key];
  }
  const choose = <T extends string | number>(key: string, choices: readonly T[], fallback: T): T =>
    choices.includes(input[key] as T) ? (input[key] as T) : fallback;
  result.scheme = choose("scheme", ["system", "light", "dark"], result.scheme);
  result.palette = choose(
    "palette",
    ["graphite", "iris", "ocean", "ember", "grove"],
    result.palette,
  );
  result.fontFamily = choose("fontFamily", ["Segoe UI", "Calibri", "Georgia"], result.fontFamily);
  result.updateIntervalHours = choose(
    "updateIntervalHours",
    [1, 6, 24],
    result.updateIntervalHours,
  );
  for (const [key, min, max] of [
    ["contrast", 100, 140],
    ["panelOpacity", 75, 100],
    ["animationMs", 0, 400],
    ["fontSize", 12, 18],
  ] as const) {
    const number = input[key];
    if (typeof number === "number" && Number.isFinite(number))
      result[key] = Math.max(min, Math.min(max, Math.round(number)));
  }
  if (typeof input.defaultOutputDir === "string")
    result.defaultOutputDir = input.defaultOutputDir.slice(0, 32767);
  if (input.shortcuts && typeof input.shortcuts === "object") {
    const shortcuts = input.shortcuts as Record<string, unknown>;
    const candidate = { ...result.shortcuts };
    for (const key of ["search", "settings", "catalog"] as const) {
      if (
        typeof shortcuts[key] === "string" &&
        /^(?:Ctrl\+(?:Alt\+)?|Alt\+)(?:Shift\+)?(?:[A-Z0-9,./;]|F(?:[1-9]|1[0-2]))$/.test(
          shortcuts[key],
        )
      )
        candidate[key] = shortcuts[key];
    }
    if (new Set(Object.values(candidate)).size === 3) result.shortcuts = candidate;
  }
  return result;
}

export function shortcutFor(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">,
): string {
  if (event.metaKey || ["Control", "Alt", "Shift", "Meta"].includes(event.key)) return "";
  return `${event.ctrlKey ? "Ctrl+" : ""}${event.altKey ? "Alt+" : ""}${event.shiftKey ? "Shift+" : ""}${event.key.length === 1 ? event.key.toUpperCase() : event.key}`;
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      return validateSettings(JSON.parse(localStorage.getItem(storageKey) ?? "null"));
    } catch {
      return structuredClone(defaultSettings);
    }
  });
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
      setStorageError("");
    } catch {
      setStorageError("No se pudieron guardar los ajustes en este equipo.");
    }
  }, [settings]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const root = document.documentElement;
      root.dataset.scheme =
        settings.scheme === "system" ? (media.matches ? "dark" : "light") : settings.scheme;
      root.dataset.palette = settings.palette;
      root.style.setProperty("--ui-font", `"${settings.fontFamily}", sans-serif`);
      root.style.fontSize = `${settings.fontSize}px`;
      root.style.setProperty("--panel-opacity", `${settings.panelOpacity}%`);
      root.style.setProperty("--animation", `${settings.animationMs}ms`);
      root.style.setProperty("--contrast-mix", `${settings.contrast - 100}%`);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings]);
  return {
    settings,
    storageError,
    update: (patch: Partial<AppSettings>) =>
      setSettings((current) => validateSettings({ ...current, ...patch })),
    reset: () => setSettings(structuredClone(defaultSettings)),
  };
}
