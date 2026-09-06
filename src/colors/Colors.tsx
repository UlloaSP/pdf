import { useState, type Ref } from "react";
import { Search, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ColorTool } from "./types";
import { normalizeHex } from "./hex";

const modules = import.meta.glob<{ default: ColorTool }>("./tools/*.tsx", { eager: true });
const tools = Object.values(modules)
  .map((module) => module.default)
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

export function Colors({
  searchRef,
  query,
  onQueryChange,
}: {
  searchRef: Ref<HTMLInputElement>;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const [color, setColor] = useState("#635dd7");
  const [draft, setDraft] = useState(color);
  const [selected, setSelected] = useState(tools[0]?.id ?? "");
  const invalid = normalizeHex(draft) === null;
  const visible = tools.filter((tool) =>
    normalizeSearch(`${tool.name} ${tool.description}`).includes(normalizeSearch(query.trim())),
  );
  const active = visible.find((tool) => tool.id === selected) ?? visible[0];
  function changeColor(value: string) {
    const normalized = normalizeHex(value);
    if (normalized) {
      setColor(normalized);
      setDraft(normalized);
    }
  }
  return (
    <section
      className="mx-auto flex min-w-0 max-w-5xl flex-col gap-6"
      aria-labelledby="colors-title"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1
            id="colors-title"
            className="flex items-center gap-2 text-2xl font-semibold tracking-tight"
          >
            <Palette aria-hidden="true" className="size-6" /> Colores
          </h1>
        </div>
        <InputGroup className="h-10 w-full max-w-[310px]">
          <InputGroupInput
            ref={searchRef}
            type="search"
            aria-label="Buscar herramienta de color"
            placeholder="Buscar en Colores…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </header>
      <Card>
        <CardContent className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-[minmax(100px,1fr)_minmax(0,2fr)]">
          <div
            role="img"
            aria-label={`Muestra del color ${color}`}
            className="min-h-24 rounded-lg border"
            style={{ backgroundColor: color }}
          />
          <FieldGroup className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
            <Field>
              <FieldLabel htmlFor="colors-picker">Selector</FieldLabel>
              <Input
                id="colors-picker"
                type="color"
                value={color}
                className="h-10 p-1"
                onChange={(event) => changeColor(event.target.value)}
              />
            </Field>
            <Field data-invalid={invalid}>
              <FieldLabel htmlFor="colors-hex">Código HEX</FieldLabel>
              <Input
                id="colors-hex"
                value={draft}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={invalid}
                aria-describedby="colors-hex-help"
                maxLength={32}
                onChange={(event) => {
                  setDraft(event.target.value);
                  const normalized = normalizeHex(event.target.value);
                  if (normalized) setColor(normalized);
                }}
                onBlur={() => {
                  if (!invalid) setDraft(color);
                }}
              />
              <FieldDescription id="colors-hex-help">
                {invalid
                  ? "Introduce un código como #635dd7 o #63d. Se conserva el último color válido."
                  : "sRGB · #RGB o #RRGGBB"}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      {active ? (
        <>
          <ToggleGroup
            type="single"
            value={active.id}
            aria-label="Herramientas de color"
            className="w-full flex-wrap justify-start"
            onValueChange={(id) => {
              if (id) setSelected(id);
            }}
          >
            {visible.map((tool) => (
              <ToggleGroupItem key={tool.id} value={tool.id}>
                {tool.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Separator />
          <section
            key={active.id}
            className="flex min-w-0 flex-col gap-4"
            aria-labelledby="color-tool-title"
          >
            <header className="flex flex-col gap-1">
              <h2 id="color-tool-title" className="text-lg font-semibold">
                {active.name}
              </h2>
              <p className="text-sm text-muted-foreground">{active.description}</p>
            </header>
            <active.Component color={color} onColorChange={changeColor} />
          </section>
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {tools.length ? "No hay herramientas con ese nombre" : "Selector de color disponible"}
            </EmptyTitle>
            <EmptyDescription>
              {tools.length
                ? "Prueba otra búsqueda."
                : "Puedes elegir y editar un color. Esta compilación aún no incluye módulos de análisis."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
