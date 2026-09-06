import {
  FileText,
  ImageIcon,
  Palette,
  Settings2,
  RefreshCw,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { version as packageVersion } from "../package.json";
import { Settings } from "./Settings";
import { useSettings, shortcutFor } from "./appSettings";
import { useUpdater } from "./useUpdater";
import { getAppInfo } from "./native";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { RevealPanel } from "./RevealPanel";
import { WindowControls } from "./WindowControls";
import { tools } from "./tools";
import { features, type Feature } from "./features";
import { Workspace } from "./Workspace";
const Colors = lazy(() => import("./colors/Colors").then((module) => ({ default: module.Colors })));

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
  const [workspace, setWorkspace] = useState<"pdf" | "images" | "colors">("pdf");
  const workspaceLabel =
    workspace === "pdf" ? "PDF" : workspace === "images" ? "Imágenes" : "Colores";
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
    <div className="h-full overflow-hidden bg-frame p-(--frame) [--frame:8px] [@media(hover:none)]:[--frame:12px]">
      <RevealPanel side="top" label="Mostrar barra superior">
        <header className="flex h-10 items-stretch rounded-none bg-frame text-frame-foreground shadow-lg">
          <div className="flex-1 select-none" data-tauri-drag-region />
          <WindowControls />
        </header>
      </RevealPanel>
      <RevealPanel side="left" label="Mostrar navegación">
        <aside className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-sidebar px-4 py-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <span
              className="rounded-lg bg-primary px-2 font-serif text-3xl text-primary-foreground"
              aria-hidden="true"
            >
              P.
            </span>
            PDF Utils
          </div>
          <nav
            className="mt-8 min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]"
            aria-label="Bibliotecas de herramientas"
          >
            <ToggleGroup
              type="single"
              orientation="vertical"
              className="w-full"
              value={workspace}
              disabled={busy || updater.installing}
              onValueChange={(value) => {
                if (value !== "pdf" && value !== "images" && value !== "colors") return;
                setShowSettings(false);
                setWorkspace(value);
                setQuery("");
                setSelected(null);
              }}
            >
              <ToggleGroupItem value="pdf" className="h-11 w-full justify-start gap-3">
                <FileText data-icon="inline-start" />
                PDF
              </ToggleGroupItem>
              <ToggleGroupItem value="images" className="h-11 w-full justify-start gap-3">
                <ImageIcon data-icon="inline-start" />
                Imágenes
              </ToggleGroupItem>
              <ToggleGroupItem value="colors" className="h-11 w-full justify-start gap-3">
                <Palette data-icon="inline-start" />
                Colores
              </ToggleGroupItem>
            </ToggleGroup>
          </nav>
          <Separator className="my-4" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ajustes"
              title="Ajustes"
              aria-pressed={showSettings}
              disabled={updater.installing}
              onClick={() => setShowSettings((current) => !current)}
            >
              <Settings2 />
            </Button>
            <Button
              variant="ghost"
              className="h-auto min-w-0 flex-1 justify-start py-2"
              disabled={!updater.canAct}
              title={`${updater.label}. ${updater.detail}`}
              aria-label={updater.label}
              onClick={() => void updater.action()}
            >
              <RefreshCw data-icon="inline-start" />
              <span className="min-w-0 whitespace-normal wrap-anywhere">{updater.label}</span>
            </Button>
          </div>
        </aside>
      </RevealPanel>
      <main
        id="main"
        ref={main}
        tabIndex={-1}
        className="relative h-full min-w-0 overflow-auto rounded-[9px] bg-background px-[clamp(22px,3.6vw,56px)] pt-7 pb-10 outline-none [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] max-[620px]:p-5"
      >
        {storageError && (
          <Alert variant="destructive">
            <AlertDescription>{storageError}</AlertDescription>
          </Alert>
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
          {workspace === "colors" ? (
            <Suspense fallback={<p role="status">Cargando herramientas de color…</p>}>
              <Colors searchRef={search} query={query} onQueryChange={setQuery} />
            </Suspense>
          ) : selected ? (
            <div className="mx-auto my-2 max-w-[1000px]">
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
              <div className="mb-6 flex min-h-10 items-center gap-3">
                <h1 className="sr-only">Herramientas de {workspaceLabel}</h1>
                <InputGroup className="h-10 max-w-[310px]">
                  <InputGroupInput
                    ref={search}
                    type="search"
                    aria-label="Buscar herramienta"
                    placeholder={`Buscar en ${workspaceLabel}…`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                </InputGroup>
              </div>
              <p className="sr-only" role="status">
                {visible.length} herramientas
              </p>
              <section
                className="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-3.5 max-[620px]:grid-cols-2 max-[620px]:gap-2.5 max-[420px]:grid-cols-1"
                aria-label="Catálogo de utilidades"
              >
                {visible.map((tool) => (
                  <Card key={tool.name} role="article" className="min-h-[210px]">
                    <CardHeader>
                      <Badge variant="secondary" className="mb-3">
                        {workspace === "pdf" ? "PDF" : "IMG"}
                      </Badge>
                      <CardTitle>
                        <h2>{tool.name}</h2>
                      </CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </CardHeader>
                    {tool.feature && (
                      <CardFooter className="mt-auto">
                        <Button
                          variant="link"
                          className="px-0"
                          onClick={() => setSelected(tool.feature!)}
                        >
                          Abrir <span className="sr-only">{tool.name}</span>
                          <ArrowUpRight data-icon="inline-end" />
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </section>
              {visible.length === 0 && (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No hay herramientas con ese nombre</EmptyTitle>
                    <EmptyDescription>Prueba otra búsqueda o sección.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
