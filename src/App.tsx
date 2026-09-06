import { useEffect, useRef, useState } from "react";
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
  const [selected, setSelected] = useState<Feature | null>(null);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<Category>("Todas");
  const [query, setQuery] = useState("");
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [selected, category]);
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
                disabled={busy}
                aria-pressed={category === item}
                onClick={() => {
                  setCategory(item);
                  setSelected(null);
                }}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>
      </RevealPanel>
      <main id="main" ref={main} tabIndex={-1}>
        {selected ? (
          <div className="workspace-shell">
            <Workspace
              key={selected.id}
              feature={selected}
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
      </main>
    </div>
  );
}
