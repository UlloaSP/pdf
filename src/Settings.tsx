import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppSettings } from "./settings";

type Section = "general" | "appearance" | "shortcuts" | "about";
type ShortcutName = keyof AppSettings["shortcuts"];

export interface SettingsProps {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onReset: () => void;
  onClose: () => void;
  version: string;
  updater: {
    label: string;
    detail: string;
    canAct: boolean;
    action: () => Promise<void>;
    lastChecked: number | null;
    version?: string;
    progress?: number;
  };
}

const sections: { id: Section; label: string; mark: string }[] = [
  { id: "general", label: "General", mark: "☷" },
  { id: "appearance", label: "Apariencia", mark: "◐" },
  { id: "shortcuts", label: "Atajos", mark: "⌘" },
  { id: "about", label: "Acerca de", mark: "ⓘ" },
];
const palettes: { id: AppSettings["palette"]; name: string; color: string }[] = [
  { id: "graphite", name: "Grafito", color: "#68717b" },
  { id: "iris", name: "Iris", color: "#8a73bf" },
  { id: "ocean", name: "Océano", color: "#3988aa" },
  { id: "ember", name: "Arcilla", color: "#bf6649" },
  { id: "grove", name: "Bosque", color: "#598763" },
];

function Row({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <span className="settings-row-title">{title}</span>
        {detail && <p>{detail}</p>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="settings-switch"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="settings-slider">
      <input
        id={id}
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output htmlFor={id}>
        {value}
        {unit}
      </output>
    </div>
  );
}

export function Settings({
  settings,
  onChange,
  onReset,
  onClose,
  version,
  updater,
}: SettingsProps) {
  const [section, setSection] = useState<Section>("general");
  const [recording, setRecording] = useState<ShortcutName | null>(null);
  const [error, setError] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [checking, setChecking] = useState(false);
  const activeSection = sections.find((item) => item.id === section)!;

  async function chooseFolder() {
    setError("");
    if (!isTauri()) {
      setError(
        "El selector de carpetas está disponible en la aplicación de Windows. Puedes escribir la ruta.",
      );
      return;
    }
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Carpeta de salida predeterminada",
      });
      if (typeof selected === "string") onChange({ defaultOutputDir: selected });
    } catch {
      setError("No se pudo abrir el selector de carpetas.");
    }
  }

  function captureShortcut(event: KeyboardEvent<HTMLButtonElement>, name: ShortcutName) {
    if (recording !== name) return;
    event.stopPropagation();
    if (event.key === "Tab") {
      setRecording(null);
      return;
    }
    event.preventDefault();
    if (event.key === "Escape") {
      setRecording(null);
      setError("");
      return;
    }
    if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;
    if (
      !(event.ctrlKey || event.altKey) ||
      event.metaKey ||
      event.key === "Unidentified" ||
      event.key === "Dead"
    ) {
      setError("Usa Ctrl o Alt junto a una letra, número o tecla de función. Escape cancela.");
      return;
    }
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
    if (!/^[A-Z0-9]$|^F(?:[1-9]|1[0-2])$/.test(key)) {
      setError("Elige una letra, un número o una tecla F1–F12 junto a Ctrl o Alt.");
      return;
    }
    const binding = [event.ctrlKey && "Ctrl", event.altKey && "Alt", event.shiftKey && "Shift", key]
      .filter(Boolean)
      .join("+");
    if (
      Object.entries(settings.shortcuts).some(
        ([other, value]) => other !== name && value.toLowerCase() === binding.toLowerCase(),
      )
    ) {
      setError("Ese atajo ya está asignado. Elige otra combinación.");
      return;
    }
    onChange({ shortcuts: { ...settings.shortcuts, [name]: binding } });
    setRecording(null);
    setError("");
  }

  async function update() {
    setChecking(true);
    setError("");
    try {
      await updater.action();
    } catch {
      setError("No se pudo completar la comprobación. Inténtalo de nuevo.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="app-settings" aria-label="Ajustes de la aplicación">
      <header className="settings-header">
        <div>
          <span className="settings-eyebrow">TU ESPACIO DE TRABAJO</span>
          <h1>Ajustes</h1>
        </div>
        <div className="settings-header-actions">
          <button
            type="button"
            className="settings-quiet"
            onClick={() => setResetConfirm(!resetConfirm)}
          >
            Restablecer
          </button>
          <button
            type="button"
            className="settings-close"
            aria-label="Cerrar ajustes"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </header>
      {resetConfirm && (
        <div className="settings-reset" role="group" aria-label="Confirmar restablecimiento">
          <p>¿Restablecer todos los ajustes? Tus documentos se conservarán.</p>
          <button
            type="button"
            onClick={() => {
              onReset();
              setResetConfirm(false);
              setRecording(null);
              setError("");
            }}
          >
            Restablecer ajustes
          </button>
          <button type="button" onClick={() => setResetConfirm(false)}>
            Cancelar
          </button>
        </div>
      )}
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Secciones de ajustes">
          {sections.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => {
                setSection(item.id);
                setRecording(null);
                setError("");
              }}
            >
              <span aria-hidden="true">{item.mark}</span>
              {item.label}
            </button>
          ))}
          <span className="settings-nav-foot">
            PDF Utils<span>Hecho para trabajar en local.</span>
          </span>
        </nav>
        <div className="settings-content" key={section}>
          <div className="settings-section-heading">
            <h2>{activeSection.label}</h2>
            <p>
              {section === "general"
                ? "Las pequeñas decisiones de cada día."
                : section === "appearance"
                  ? "Un espacio cómodo, a tu manera."
                  : section === "shortcuts"
                    ? "Tus acciones habituales, a un par de teclas."
                    : "Tu aplicación y sus actualizaciones."}
            </p>
          </div>
          {error && (
            <p className="settings-error" role="alert">
              {error}
            </p>
          )}
          {section === "general" && (
            <>
              <h3 className="settings-group-title">Archivos</h3>
              <div className="settings-group">
                <div className="settings-folder">
                  <label htmlFor="settings-output-dir">Carpeta de salida predeterminada</label>
                  <p>
                    La carpeta que se propone al abrir una utilidad. Puedes cambiarla en cada
                    trabajo.
                  </p>
                  <div>
                    <input
                      id="settings-output-dir"
                      value={settings.defaultOutputDir}
                      placeholder="Seleccionar en cada trabajo"
                      onChange={(event) => onChange({ defaultOutputDir: event.target.value })}
                    />
                    <button type="button" onClick={() => void chooseFolder()}>
                      Elegir…
                    </button>
                  </div>
                </div>
                <Row
                  title="Recordar la última carpeta"
                  detail="Usarla como destino en el siguiente trabajo."
                >
                  <Toggle
                    label="Recordar la última carpeta"
                    checked={settings.rememberOutputDir}
                    onChange={(rememberOutputDir) => onChange({ rememberOutputDir })}
                  />
                </Row>
              </div>
              <h3 className="settings-group-title">Confirmaciones</h3>
              <div className="settings-group">
                <Row
                  title="Antes de cancelar un trabajo"
                  detail="Pedir confirmación si hay un documento en proceso."
                >
                  <Toggle
                    label="Confirmar antes de cancelar un trabajo"
                    checked={settings.confirmCancel}
                    onChange={(confirmCancel) => onChange({ confirmCancel })}
                  />
                </Row>
                <Row
                  title="Antes de cerrar con un trabajo activo"
                  detail="Pedir confirmación para interrumpir el procesamiento."
                >
                  <Toggle
                    label="Confirmar cierre con un trabajo activo"
                    checked={settings.confirmClose}
                    onChange={(confirmClose) => onChange({ confirmClose })}
                  />
                </Row>
              </div>
              <h3 className="settings-group-title">Actualizaciones</h3>
              <div className="settings-group">
                <Row
                  title="Buscar actualizaciones automáticamente"
                  detail="Comprobar si hay una versión estable nueva."
                >
                  <Toggle
                    label="Buscar actualizaciones automáticamente"
                    checked={settings.autoCheckUpdates}
                    onChange={(autoCheckUpdates) => onChange({ autoCheckUpdates })}
                  />
                </Row>
                <Row title="Frecuencia de comprobación">
                  <select
                    aria-label="Frecuencia de comprobación"
                    disabled={!settings.autoCheckUpdates}
                    value={settings.updateIntervalHours}
                    onChange={(event) =>
                      onChange({ updateIntervalHours: Number(event.target.value) as 1 | 6 | 24 })
                    }
                  >
                    <option value={1}>Cada hora</option>
                    <option value={6}>Cada 6 horas</option>
                    <option value={24}>Cada día</option>
                  </select>
                </Row>
              </div>
            </>
          )}
          {section === "appearance" && (
            <>
              <h3 className="settings-group-title">Tema</h3>
              <div className="settings-schemes" role="group" aria-label="Tema de la aplicación">
                {(
                  [
                    ["system", "Sistema"],
                    ["light", "Claro"],
                    ["dark", "Oscuro"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={settings.scheme === value}
                    onClick={() => onChange({ scheme: value })}
                  >
                    <span
                      className={`settings-theme-preview settings-theme-${value}`}
                      aria-hidden="true"
                    >
                      <i />
                      <span>
                        <b />
                        <b />
                        <b />
                      </span>
                    </span>
                    <span>
                      {label}
                      <span className="settings-selected-dot" />
                    </span>
                  </button>
                ))}
              </div>
              <h3 className="settings-group-title">Color de acento</h3>
              <div className="settings-palettes" role="group" aria-label="Color de acento">
                {palettes.map((palette) => (
                  <button
                    type="button"
                    key={palette.id}
                    aria-pressed={settings.palette === palette.id}
                    onClick={() => onChange({ palette: palette.id })}
                  >
                    <span style={{ backgroundColor: palette.color }} aria-hidden="true">
                      {settings.palette === palette.id ? "✓" : ""}
                    </span>
                    {palette.name}
                  </button>
                ))}
              </div>
              <h3 className="settings-group-title">Superficies y movimiento</h3>
              <div className="settings-group">
                <Row title="Contraste">
                  <Slider
                    label="Contraste"
                    value={settings.contrast}
                    min={100}
                    max={140}
                    unit="%"
                    onChange={(contrast) => onChange({ contrast })}
                  />
                </Row>
                <Row title="Opacidad de los paneles">
                  <Slider
                    label="Opacidad de los paneles"
                    value={settings.panelOpacity}
                    min={75}
                    max={100}
                    unit="%"
                    onChange={(panelOpacity) => onChange({ panelOpacity })}
                  />
                </Row>
                <Row title="Duración de las animaciones" detail="0 ms desactiva el movimiento.">
                  <Slider
                    label="Duración de las animaciones"
                    value={settings.animationMs}
                    min={0}
                    max={400}
                    step={10}
                    unit=" ms"
                    onChange={(animationMs) => onChange({ animationMs })}
                  />
                </Row>
              </div>
              <h3 className="settings-group-title">Tipografía</h3>
              <div className="settings-group">
                <Row title="Fuente de la interfaz">
                  <select
                    aria-label="Fuente de la interfaz"
                    value={settings.fontFamily}
                    onChange={(event) =>
                      onChange({ fontFamily: event.target.value as AppSettings["fontFamily"] })
                    }
                  >
                    {["Segoe UI", "Calibri", "Georgia"].map((font) => (
                      <option key={font}>{font}</option>
                    ))}
                  </select>
                </Row>
                <Row title="Tamaño de texto">
                  <Slider
                    label="Tamaño de texto"
                    value={settings.fontSize}
                    min={12}
                    max={18}
                    unit=" px"
                    onChange={(fontSize) => onChange({ fontSize })}
                  />
                </Row>
              </div>
            </>
          )}
          {section === "shortcuts" && (
            <>
              <p className="settings-hint">
                Pulsa un atajo y después la nueva combinación. Incluye Ctrl o Alt. Escape cancela la
                captura.
              </p>
              <div className="settings-group">
                {(
                  [
                    ["search", "Buscar utilidades", "Ir al buscador del catálogo."],
                    ["settings", "Abrir ajustes", "Volver a esta pantalla."],
                    ["catalog", "Abrir catálogo", "Ver todas las utilidades."],
                  ] as const
                ).map(([name, title, detail]) => (
                  <Row key={name} title={title} detail={detail}>
                    <button
                      type="button"
                      className={`settings-shortcut${recording === name ? " is-recording" : ""}`}
                      aria-label={`${title}: ${recording === name ? "esperando combinación" : settings.shortcuts[name]}`}
                      onClick={() => {
                        setRecording(name);
                        setError("");
                      }}
                      onBlur={() => {
                        if (recording === name) setRecording(null);
                      }}
                      onKeyDown={(event) => captureShortcut(event, name)}
                    >
                      {recording === name
                        ? "Pulsa una combinación…"
                        : settings.shortcuts[name]
                            .split("+")
                            .map((key, index) => <kbd key={`${key}-${index}`}>{key}</kbd>)}
                    </button>
                  </Row>
                ))}
              </div>
              <p className="settings-footnote">
                Los atajos solo actúan dentro de PDF Utils. Algunas combinaciones están reservadas
                por Windows.
              </p>
            </>
          )}
          {section === "about" && (
            <>
              <div className="settings-about-brand">
                <span aria-hidden="true">
                  P<span>↗</span>
                </span>
                <div>
                  <h3>PDF Utils</h3>
                  <p>Herramientas para tus documentos.</p>
                </div>
              </div>
              <div className="settings-group">
                <Row title="Versión instalada">
                  <span className="settings-version">{version}</span>
                </Row>
                <Row title="Canal de actualización">
                  <span className="settings-channel">
                    <span />
                    Estable
                  </span>
                </Row>
              </div>
              <h3 className="settings-group-title">Actualizaciones</h3>
              <div className="settings-update" aria-live="polite">
                <h3>{updater.label}</h3>
                <p>{updater.detail}</p>
                {updater.version && (
                  <p className="settings-update-version">Versión disponible: {updater.version}</p>
                )}
                {typeof updater.progress === "number" && (
                  <progress
                    aria-label="Progreso de la actualización"
                    max={100}
                    value={Math.max(0, Math.min(100, updater.progress))}
                  />
                )}
                <button
                  type="button"
                  disabled={!updater.canAct || checking}
                  onClick={() => void update()}
                >
                  {checking ? "Comprobando…" : updater.label}
                </button>
                <span className="settings-footnote">
                  {updater.lastChecked
                    ? `Última comprobación: ${new Date(updater.lastChecked).toLocaleString("es-ES")}`
                    : "Todavía no se ha comprobado esta sesión."}
                </span>
              </div>
              <p className="settings-footnote">
                Los documentos se procesan en tu equipo. Algunas utilidades necesitan motores
                locales adicionales.
              </p>
            </>
          )}
          <p className="settings-saved">Los cambios se guardan automáticamente.</p>
        </div>
      </div>
    </section>
  );
}
