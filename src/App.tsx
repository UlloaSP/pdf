import { useEffect, useState } from "react";
import { getAppInfo } from "./native";
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
const catalog = tools.map((tool, index) => {
  const feature = features.find((candidate) => candidate.id === ids[index]);
  return {
    ...tool,
    description: feature?.description ?? tool.description,
    feature,
  };
});

export function App() {
  const [selected, setSelected] = useState<Feature | null>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selected]);
  const [category, setCategory] = useState<Category>("Todas");
  const [query, setQuery] = useState("");
  const [runtime, setRuntime] = useState("Comprobando conexión local…");
  useEffect(() => {
    let active = true;
    getAppInfo()
      .then((info) => {
        if (active)
          setRuntime(
            info
              ? `Motor local conectado · v${info.version}`
              : "Vista previa web · sin motor nativo",
          );
      })
      .catch(() => {
        if (active) setRuntime("No se ha podido conectar con el motor local");
      });
    return () => {
      active = false;
    };
  }, []);
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const visible = catalog.filter(
    (tool) =>
      (category === "Todas" || tool.category === category) &&
      normalize(`${tool.name} ${tool.description}`).includes(
        normalize(query.trim()),
      ),
  );

  if (selected)
    return (
      <main className="workspace-shell">
        <Workspace
          key={selected.id}
          feature={selected}
          onClose={() => setSelected(null)}
        />
      </main>
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#main">
          <span className="brand-mark" aria-hidden="true">
            P.
          </span>{" "}
          PDF Utils
        </a>
        <p className="nav-label">ESPACIO DE TRABAJO</p>
        <nav aria-label="Categorías de herramientas">
          {categories.map((item) => (
            <button
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
              <span>
                {item === "Todas"
                  ? tools.length
                  : tools.filter((tool) => tool.category === item).length}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" />
          Diseñada para trabajar en local<p>Tus documentos, en tu equipo.</p>
        </div>
      </aside>
      <main id="main">
        <header className="topbar">
          <span>Biblioteca de herramientas</span>
          <span className="build-label">DESARROLLO</span>
        </header>
        <section className="intro" aria-labelledby="title">
          <p className="eyebrow">DOCUMENTOS EN ORDEN</p>
          <h1 id="title">Un lugar para tus PDF.</h1>
          <p>Organiza, convierte y prepara tus documentos desde Windows.</p>
        </section>
        <div className="notice">
          <strong>Procesamiento local de documentos.</strong>
          <span>
            Elige una herramienta disponible para seleccionar archivos y guardar
            el resultado en una nueva carpeta. Las dependencias adicionales se
            indican en cada utilidad.
          </span>
        </div>
        <div className="catalog-heading">
          <h2>{category === "Todas" ? "Todas las herramientas" : category}</h2>
          <label className="search">
            <span className="sr-only">Buscar herramienta</span>
            <input
              type="search"
              placeholder="Buscar herramienta…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <p className="result-count" role="status">
          {visible.length}{" "}
          {visible.length === 1 ? "herramienta" : "herramientas"}
        </p>
        <section className="tool-grid" aria-label="Catálogo de utilidades">
          {visible.map((tool) => (
            <article className="tool-card" key={tool.name}>
              <div className="card-meta">
                <span className="file-icon" aria-hidden="true">
                  PDF
                </span>
                <span className="planned">
                  {tool.feature
                    ? tool.feature.requirements.length
                      ? "Motor adicional"
                      : "Disponible"
                    : "Planificada"}
                </span>
              </div>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              {tool.feature ? (
                <button
                  className="open-tool"
                  onClick={() => setSelected(tool.feature!)}
                >
                  Abrir {tool.name}
                </button>
              ) : null}
            </article>
          ))}
        </section>
        {visible.length === 0 ? (
          <p className="empty">
            No hay herramientas con ese nombre. Prueba otra búsqueda o
            categoría.
          </p>
        ) : null}
        <footer>
          <span role="status">{runtime}</span>
          <span>PDF Utils · versión de desarrollo</span>
        </footer>
      </main>
    </div>
  );
}
