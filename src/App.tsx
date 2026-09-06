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
import { tools } from "./tools";
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
    workspace: feature?.workspace ?? "pdf",
  };
});
const catalog = [
  ...plannedCatalog,
  ...features
    .filter((feature) => !ids.includes(feature.id))
    .map((feature) => ({ ...feature, feature, workspace: feature.workspace ?? "pdf" })),
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
          if (window.confirm("Hay un archivo en proceso. ¿Cancelar y cerrar la aplicación?")) {
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
  const [workspace, setWorkspace] = useState<"pdf" | "images">("pdf");
  const workspaceLabel = workspace === "pdf" ? "PDF" : "Imágenes";
  const [query, setQuery] = useState("");
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [selected, workspace, showSettings]);
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const visible = catalog.filter(
    (tool) =>
      tool.workspace === workspace &&
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
          <nav aria-label="Bibliotecas de herramientas">
            {(
              [
                { id: "pdf", label: "PDF" },
                { id: "images", label: "Imágenes" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                disabled={busy || updater.installing}
                aria-pressed={workspace === item.id}
                onClick={() => {
                  setShowSettings(false);
                  setWorkspace(item.id);
                  setQuery("");
                  setSelected(null);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {item.id === "pdf" ? (
                    <path d="M6 3h8l4 4v14H6Z M14 3v5h4 M9 12h6 M9 16h6" />
                  ) : (
                    <>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m4 19 6-6 4 3 3-5 4 7" />
                    </>
                  )}
                </svg>
                {item.label}
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
                <h1 className="sr-only">Herramientas de {workspaceLabel}</h1>
                <label className="search">
                  <span className="sr-only">Buscar herramienta</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                  <input
                    ref={search}
                    type="search"
                    placeholder={`Buscar en ${workspaceLabel}…`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
              <p className="sr-only" role="status">
                {visible.length} herramientas
              </p>
              <section className="tool-grid" aria-label="Catálogo de utilidades">
                {visible.map((tool) => (
                  <article className="tool-card" key={tool.name}>
                    <span className="file-icon" aria-hidden="true">
                      {workspace === "pdf" ? "PDF" : "IMG"}
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
                  No hay herramientas con ese nombre. Prueba otra búsqueda o sección.
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
