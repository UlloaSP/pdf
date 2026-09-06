import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parseCatalog, matchCatalog, distribution, type Paint } from "../paintCatalog";
import { callPaintApi, parseBrands, type Brand, type PaintOperation } from "../paintApi";
import type { ColorTool, ColorToolProps } from "../types";

const storageKey = "pdf-utils.paint-catalog.v1";
function storedCatalog(): { paints: Paint[]; error: string } {
  try {
    const stored = localStorage.getItem(storageKey);
    return { paints: stored ? parseCatalog(stored) : [], error: "" };
  } catch {
    return {
      paints: [],
      error: "No se pudo leer el catálogo guardado. Puedes importar otra copia.",
    };
  }
}
function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Histogram({ title, values, range }: { title: string; values: number[]; range: number }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div
        className="flex h-20 items-end gap-1"
        role="img"
        aria-label={`${title}: ${values.map((count, index) => `${Math.round((index * range) / values.length)}–${Math.round(((index + 1) * range) / values.length)}: ${count}`).join(", ")}`}
      >
        {values.map((count, index) => (
          <span
            key={index}
            className="min-w-0 flex-1 bg-primary"
            style={{ height: `${(count / max) * 100}%` }}
            title={`${Math.round((index * range) / values.length)}–${Math.round(((index + 1) * range) / values.length)}: ${count}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        0–{range}
        {range === 360 ? "°" : "%"}
      </span>
    </div>
  );
}
function LocalCatalog({ color, onColorChange }: ColorToolProps) {
  const [initial] = useState(storedCatalog);
  const [paints, setPaints] = useState(initial.paints);
  const [message, setMessage] = useState(initial.error);
  const [brand, setBrand] = useState("");
  const [query, setQuery] = useState("");
  const [delta, setDelta] = useState("200");
  const [page, setPage] = useState(0);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const brands = useMemo(
    () => [...new Set(paints.map((p) => p.brand))].sort((a, b) => a.localeCompare(b, "es")),
    [paints],
  );
  const validDelta =
    delta.trim() !== "" &&
    Number.isFinite(Number(delta)) &&
    Number(delta) >= 0 &&
    Number(delta) <= 200;
  const matches = useMemo(
    () => (validDelta ? matchCatalog(paints, color, brand, query, Number(delta)) : []),
    [paints, color, brand, query, delta, validDelta],
  );
  const profile = useMemo(
    () => distribution(paints.filter((p) => !brand || p.brand === brand)),
    [paints, brand],
  );
  const currentPage = Math.min(page, Math.max(0, Math.ceil(matches.length / 48) - 1));
  async function importFile(file?: File) {
    if (!file) return;
    const current = ++generation.current;
    try {
      if (file.size > 2_000_000) throw new Error("El catálogo supera 2 MB.");
      const next = parseCatalog(await file.text());
      if (current !== generation.current) return;
      setPaints(next);
      setBrand("");
      setPage(0);
      setMessage(`${next.length} pinturas importadas.`);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        setMessage(
          "Catálogo cargado, pero no se pudo guardar en este equipo. Exporta una copia antes de cerrar.",
        );
      }
    } catch (error) {
      if (current === generation.current)
        setMessage(error instanceof Error ? error.message : "No se pudo importar.");
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="paint-import">Importar catálogo propio</FieldLabel>
          <Input
            id="paint-import"
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <FieldDescription>
            JSON, hasta 10.000 pinturas y 2 MB. Cada entrada lleva brand, name y hex. La importación
            sustituye el catálogo local guardado.
          </FieldDescription>
          <code className="text-xs wrap-anywhere">
            {'[{"brand":"Mi marca","name":"Mi color","hex":"#635dd7"}]'}
          </code>
        </Field>
      </FieldGroup>
      {message && (
        <Alert>
          <AlertDescription role="status">{message}</AlertDescription>
        </Alert>
      )}
      {paints.length > 0 && (
        <>
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="paint-local-brand">Marca</FieldLabel>
              <NativeSelect
                className="w-full"
                id="paint-local-brand"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setPage(0);
                }}
              >
                <NativeSelectOption value="">Todas las marcas</NativeSelectOption>
                {brands.map((b) => (
                  <NativeSelectOption key={b} value={b}>
                    {b} ({paints.filter((p) => p.brand === b).length})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="paint-local-query">Nombre o código</FieldLabel>
              <Input
                id="paint-local-query"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </Field>
            <Field data-invalid={!validDelta}>
              <FieldLabel htmlFor="paint-local-delta">ΔE2000 máximo</FieldLabel>
              <Input
                id="paint-local-delta"
                type="number"
                min={0}
                max={200}
                step={0.1}
                value={delta}
                aria-invalid={!validDelta}
                onChange={(e) => {
                  setDelta(e.target.value);
                  setPage(0);
                }}
              />
              <FieldDescription>0 exacto; 200 muestra el catálogo completo.</FieldDescription>
            </Field>
          </FieldGroup>
          <div className="grid gap-5 sm:grid-cols-3">
            <Histogram title="Matiz (sin grises)" values={profile.hue} range={360} />
            <Histogram title="Saturación" values={profile.saturation} range={100} />
            <Histogram title="Luminosidad HSL" values={profile.lightness} range={100} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-muted-foreground">
              {matches.length} coincidencias, ordenadas por ΔE2000
            </p>
            <Button
              variant="outline"
              onClick={() => download(JSON.stringify(paints), "catalogo-pinturas.json")}
            >
              Exportar catálogo
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {matches.slice(currentPage * 48, (currentPage + 1) * 48).map((paint) => (
              <Card key={JSON.stringify([paint.brand, paint.name, paint.hex])} size="sm">
                <CardHeader>
                  <div
                    className="h-16 rounded border"
                    style={{ backgroundColor: paint.hex }}
                    role="img"
                    aria-label={paint.hex}
                  />
                  <CardTitle className="wrap-anywhere">{paint.name}</CardTitle>
                  <CardDescription className="wrap-anywhere">{paint.brand}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <span className="text-xs">
                    {paint.hex} · ΔE {paint.delta.toFixed(2)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onColorChange(paint.hex)}
                    aria-label={`Seleccionar ${paint.name} de ${paint.brand}`}
                  >
                    Seleccionar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {matches.length > 48 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm">
                {currentPage + 1} / {Math.ceil(matches.length / 48)}
              </span>
              <Button
                variant="outline"
                disabled={(currentPage + 1) * 48 >= matches.length}
                onClick={() => setPage(currentPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
function OnlineCatalog({ color, onColorChange }: ColorToolProps) {
  const [token, setToken] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brand, setBrand] = useState("");
  const [query, setQuery] = useState("");
  const [delta, setDelta] = useState("5");
  const [offset, setOffset] = useState("0");
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState<PaintOperation>("brands");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setResult(null);
    setError("");
  }, [token, color, brand, query, delta, offset]);
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
    },
    [],
  );
  async function request(kind: PaintOperation) {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    setOperation(kind);
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const data = await callPaintApi(
        {
          operation: kind,
          token,
          color,
          brand,
          query,
          delta: Number(delta),
          offset: Number(offset),
        },
        controller.signal,
      );
      if (pending.current !== controller || controller.signal.aborted) return;
      if (kind === "brands") setBrands(parseBrands(data));
      setResult(data);
    } catch (failure) {
      if (pending.current === controller)
        setError(
          controller.signal.aborted
            ? "Consulta cancelada o tiempo de espera agotado."
            : failure instanceof Error
              ? failure.message
              : "No se pudo conectar con la API.",
        );
    } finally {
      clearTimeout(timer);
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  const samples: { hex: string; label: string; delta?: number }[] = [];
  const remoteProfile =
    operation === "profile" &&
    result &&
    typeof result === "object" &&
    ["hue", "saturation", "lightness"].every((key) => {
      const values = (result as Record<string, unknown>)[key];
      return (
        Array.isArray(values) &&
        values.length > 0 &&
        values.length <= 360 &&
        values.every((v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0)
      );
    })
      ? (result as { hue: number[]; saturation: number[]; lightness: number[] })
      : null;
  if (result && typeof result === "object") {
    const list: unknown[] = Array.isArray(result)
      ? result
      : operation === "match"
        ? Object.values(result).flat()
        : [];
    for (const item of list.slice(0, 100)) {
      if (
        item &&
        typeof item === "object" &&
        "id" in item &&
        typeof item.id === "string" &&
        /^[0-9a-f]{6}$/i.test(item.id)
      ) {
        const p = item as Record<string, unknown>;
        samples.push({
          hex: `#${item.id}`,
          label: [p.brand, p.name].filter((v) => typeof v === "string").join(" · ") || item.id,
          delta:
            typeof p.delta_e === "number" && Number.isFinite(p.delta_e) ? p.delta_e : undefined,
        });
      }
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <Alert>
        <AlertDescription>
          Encycolorpedia requiere tu cuenta: Pro para marcas y perfiles; Enterprise para búsqueda y
          equivalencias. El token se conserva solo mientras esta vista está abierta. Las consultas
          envían el color o texto elegido a su API.
        </AlertDescription>
      </Alert>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="paint-token">Token de Encycolorpedia</FieldLabel>
          <Input
            id="paint-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            maxLength={8192}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setBrands([]);
              setBrand("");
            }}
          />
          <FieldDescription>
            <a
              className="underline"
              href="https://api.encycolorpedia.com/doc"
              target="_blank"
              rel="noreferrer"
            >
              Documentación y acceso a la API
            </a>
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="paint-online-brand">Marca de pintura</FieldLabel>
          <NativeSelect
            className="w-full"
            id="paint-online-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <NativeSelectOption value="">Todas las marcas</NativeSelectOption>
            {brands.map((b) => (
              <NativeSelectOption key={b.id} value={b.id}>
                {b.name} ({b.count})
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>
            Carga las marcas para seleccionar una y consultar su perfil o buscar dentro de ella.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="paint-online-query">Búsqueda y filtros</FieldLabel>
          <Input
            id="paint-online-query"
            value={query}
            maxLength={1000}
            onChange={(e) => setQuery(e.target.value)}
          />
          <FieldDescription>
            Nombre, color, URL de imagen/página o filtros de la API: red(200,255), hue(180,190),
            l(50,60).
          </FieldDescription>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="paint-online-delta">ΔE máximo para equivalencias</FieldLabel>
            <Input
              id="paint-online-delta"
              type="number"
              min={0.1}
              max={200}
              step={0.1}
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="paint-online-offset">
              Desplazamiento de búsqueda general
            </FieldLabel>
            <Input
              id="paint-online-offset"
              type="number"
              min={0}
              step={20}
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
            />
            <FieldDescription>
              20 resultados por consulta; aumenta en 20 para continuar.
            </FieldDescription>
          </Field>
        </div>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["brands", "Cargar marcas"],
            ["profile", "Perfil HSL"],
            ["match", "Buscar equivalencias"],
            ["brand-search", "Buscar en marca"],
            ["search", "Búsqueda general"],
            ["convert", "Conversiones de la API"],
          ] as const
        ).map(([kind, label]) => (
          <Button
            key={kind}
            variant="outline"
            disabled={
              busy || !token.trim() || ((kind === "profile" || kind === "brand-search") && !brand)
            }
            onClick={() => void request(kind)}
          >
            {label}
          </Button>
        ))}
        {busy && (
          <Button variant="outline" onClick={() => pending.current?.abort()}>
            Cancelar consulta
          </Button>
        )}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {busy ? "Consultando Encycolorpedia…" : result ? "Respuesta recibida." : ""}
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {remoteProfile && (
        <div className="grid gap-5 sm:grid-cols-3">
          <Histogram title="Matiz de la marca" values={remoteProfile.hue} range={360} />
          <Histogram title="Saturación de la marca" values={remoteProfile.saturation} range={100} />
          <Histogram
            title="Luminosidad HSL de la marca"
            values={remoteProfile.lightness}
            range={100}
          />
        </div>
      )}
      {samples.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {samples.map((sample, index) => (
            <Card key={`${sample.hex}-${index}`} size="sm">
              <CardHeader>
                <div
                  className="h-16 rounded border"
                  style={{ backgroundColor: sample.hex }}
                  role="img"
                  aria-label={sample.hex}
                />
                <CardTitle className="wrap-anywhere">{sample.label}</CardTitle>
                <CardDescription>
                  {sample.hex}
                  {sample.delta !== undefined ? ` · ΔE ${sample.delta.toFixed(2)}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => onColorChange(sample.hex)}>
                  Seleccionar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {result !== null && (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="paint-api-result">Respuesta completa de la API</FieldLabel>
            <Textarea
              id="paint-api-result"
              readOnly
              rows={12}
              value={JSON.stringify(result, null, 2)}
            />
            <FieldDescription>
              Se conserva la estructura original de los resultados y conversiones, incluidos los
              formatos que no ofrecen una vista de muestra.
            </FieldDescription>
            <Button
              variant="outline"
              onClick={() =>
                download(JSON.stringify(result, null, 2), "encycolorpedia-respuesta.json")
              }
            >
              Descargar respuesta JSON
            </Button>
          </Field>
        </FieldGroup>
      )}
    </div>
  );
}
function Paints(props: ColorToolProps) {
  return (
    <>
      <Tabs defaultValue="local">
        <TabsList>
          <TabsTrigger value="local">Mi catálogo</TabsTrigger>
          <TabsTrigger value="online">Encycolorpedia</TabsTrigger>
        </TabsList>
        <TabsContent value="local">
          <LocalCatalog {...props} />
        </TabsContent>
        <TabsContent value="online">
          <OnlineCatalog {...props} />
        </TabsContent>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        Las equivalencias calculadas desde sRGB son aproximaciones visuales. Verifica una muestra
        física antes de elegir pintura.
      </p>
    </>
  );
}
export default {
  id: "paints",
  name: "Pinturas",
  description: "Marcas, catálogos propios y equivalencias de color.",
  order: 50,
  Component: Paints,
} satisfies ColorTool;
