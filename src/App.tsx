import { useEffect, useRef, useState } from "react";
import { version as packageVersion } from "../package.json";
import { Settings } from "./Settings";
import { useSettings, shortcutFor } from "./appSettings";
import { useUpdater } from "./useUpdater";
import { getAppInfo } from "./native";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./settings.css";
import { RevealPanel } from "./RevealPanel";
import { WindowControls } from "./WindowControls";
import { categories, tools, type Category } from "./tools";
import { features, type Feature } from "./features";
import { Workspace } from "./Workspace";

const ids = [
  "merge",
  "split",
  "compress",
  "pdf_to_word",
  "pdf_to_powerpoint",
  "pdf_to_excel",
  "word_to_pdf",
  "powerpoint_to_pdf",
  "excel_to_pdf",
  "edit",
  "pdf_to_jpg",
  "jpg_to_pdf",
  "sign",
  "watermark",
  "rotate",
  "html_to_pdf",
  "unlock",
  "protect",
  "organize",
  "pdfa",
  "repair",
  "page_numbers",
  "scan",
  "ocr",
  "compare",
  "redact",
  "crop",
  "forms",
  "summarize",
  "translate",
  "pdf_to_markdown",
  "workflow",
];
const plannedCatalog = tools.map((tool, index) => {
  const feature = features.find((candidate) => candidate.id === ids[index]);
  return {
    ...tool,
    description: feature?.description ?? tool.description,
    feature,
  };
});
const catalog = [
  ...plannedCatalog,
  ...features
    .filter((feature) => !ids.includes(feature.id))
    .map((feature) => ({ ...feature, feature })),
];

export function App() {
  const { settings, update, reset, storageError } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [version, setVersion] = useState(packageVersion);
  const search = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Feature | null>(null);
  const [busy, setBusy] = useState(false);
  const updater = useUpdater({
    enabled: settings.autoCheckUpdates,
    intervalHours: settings.updateIntervalHours,
    busy,
  });
  useEffect(() => {
    void getAppInfo()
      .then((info) => {
        if (info) setVersion(info.version);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || updater.installing) return;
      const binding = shortcutFor(event);
      if (binding === settings.shortcuts.settings) {
        event.preventDefault();
        setShowSettings((current) => !current);
      } else if (
        !busy &&
        (binding === settings.shortcuts.search || binding === settings.shortcuts.catalog)
      ) {
        event.preventDefault();
        setShowSettings(false);
        setSelected(null);
        if (binding === settings.shortcuts.catalog) {
          setCategory("Todas");
          setQuery("");
        }
        if (binding === settings.shortcuts.search)
          requestAnimationFrame(() => search.current?.focus());
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [settings.shortcuts, busy, updater.installing]);
  const closeState = useRef({ busy, confirm: settings.confirmClose });
  closeState.current = { busy, confirm: settings.confirmClose };
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    let allowClose = false;
    void getCurrentWindow()
      .onCloseRequested((event) => {
        if (!allowClose && closeState.current.busy && closeState.current.confirm) {
          event.preventDefault();
          if (window.confirm("Hay un PDF en proceso. ¿Cancelar y cerrar la aplicación?")) {
            allowClose = true;
            void getCurrentWindow()
              .close()
              .catch(() => {
                allowClose = false;
              });
          }
        }
      })
      .then((off) => {
        if (disposed) off();
        else unlisten = off;
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  const [category, setCategory] = useState<Category>("Todas");
  const [query, setQuery] = useState("");
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [selected, category, showSettings]);
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const visible = catalog.filter(
    (tool) =>
      (category === "Todas" || tool.category === category) &&
      normalize(`${tool.name} ${tool.description}`).includes(normalize(query.trim())),
  );

  return (
    <div className="app-shell">
      <RevealPanel side="top" label="Mostrar barra superior">
        <header className="topbar">
          <div className="window-drag" data-tauri-drag-region />
          <WindowControls />
        </header>
      </RevealPanel>
      <RevealPanel side="left" label="Mostrar navegación">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              P.
            </span>{" "}
            PDF Utils
          </div>
          <nav aria-label="Categorías de herramientas">
            {categories.map((item) => (
              <button
                key={item}
                disabled={busy || updater.installing}
                aria-pressed={category === item}
                onClick={() => {
                  setShowSettings(false);
                  setCategory(item);
                  setSelected(null);
                }}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button
              aria-label="Ajustes"
              title="Ajustes"
              aria-pressed={showSettings}
              disabled={updater.installing}
              onClick={() => setShowSettings((current) => !current)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button
              className="sidebar-update"
              disabled={!updater.canAct}
              title={`${updater.label}. ${updater.detail}`}
              aria-label={updater.label}
              onClick={() => void updater.action()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 7v5h-5M4 17v-5h5M19 11a7 7 0 0 0-12-5M5 13a7 7 0 0 0 12 5" />
              </svg>
              <span>{updater.label}</span>
            </button>
          </div>
        </aside>
      </RevealPanel>
      <main id="main" ref={main} tabIndex={-1}>
        {storageError && (
          <p role="alert" className="error">
            {storageError}
          </p>
        )}
        {showSettings && (
          <Settings
            settings={settings}
            onChange={update}
            onReset={reset}
            onClose={() => setShowSettings(false)}
            version={version}
            updater={updater}
          />
        )}
        <div hidden={showSettings} inert={updater.installing}>
          {selected ? (
            <div className="workspace-shell">
              <Workspace
                key={selected.id}
                feature={selected}
                settings={settings}
                onRememberDestination={(path) => update({ defaultOutputDir: path })}
                locked={updater.installing}
                onBusyChange={setBusy}
                onClose={() => setSelected(null)}
              />
            </div>
          ) : (
            <>
              <div className="catalog-heading">
                <h1 className="sr-only">Herramientas PDF</h1>
                <label className="search">
                  <span className="sr-only">Buscar herramienta</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                  <input
                    ref={search}
                    type="search"
                    placeholder="Buscar herramienta…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                {category !== "Todas" && (
                  <button
                    className="category-filter"
                    onClick={() => setCategory("Todas")}
                    aria-label={`Quitar filtro ${category}`}
                  >
                    {category}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              </div>
              <p className="sr-only" role="status">
                {visible.length} herramientas
              </p>
              <section className="tool-grid" aria-label="Catálogo de utilidades">
                {visible.map((tool) => (
                  <article className="tool-card" key={tool.name}>
                    <span className="file-icon" aria-hidden="true">
                      PDF
                    </span>
                    <h2>{tool.name}</h2>
                    <p>{tool.description}</p>
                    {tool.feature ? (
                      <button className="open-tool" onClick={() => setSelected(tool.feature!)}>
                        Abrir <span className="sr-only">{tool.name}</span>
                        <span aria-hidden="true">↗</span>
                      </button>
                    ) : null}
                  </article>
                ))}
              </section>
              {visible.length === 0 && (
                <p className="empty">
                  No hay herramientas con ese nombre. Prueba otra búsqueda o categoría.
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
