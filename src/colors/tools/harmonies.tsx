import { useState } from "react";
import { Copy, Download, Shuffle, Save, Trash2 } from "lucide-react";
import type { ColorTool, ColorToolProps } from "../types";
import {
  harmony,
  harmonyOffsets,
  variation,
  gradient,
  parsePalettes,
  storePalettes,
  exportPalette,
  paletteStorageKey,
  maxPalettes,
  type Harmony,
  type Variation,
  type SavedPalette,
} from "../harmonies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const modes = [
  ["complementary", "Complementarios"],
  ["analogous", "Análogos"],
  ["split", "Complementarios divididos"],
  ["triadic", "Tríada"],
  ["square", "Cuadrado"],
  ["tetradic", "Tetrádica"],
  ["lightness", "Monocromática · luminosidad"],
  ["saturation", "Monocromática · saturación"],
  ["shades", "Sombras · hacia negro"],
  ["tints", "Tintas · hacia blanco"],
  ["tones", "Tonos · hacia gris"],
  ["gradient", "Degradado"],
] as const;
type Mode = (typeof modes)[number][0];
function Swatches({
  colors,
  onColorChange,
}: {
  colors: string[];
  onColorChange: (hex: string) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(85px,1fr))] gap-2">
      {colors.map((hex, index) => (
        <Button
          key={`${hex}-${index}`}
          variant="outline"
          className="h-auto min-w-0 flex-col gap-2 p-2"
          aria-label={`Usar color ${hex}, muestra ${index + 1}`}
          onClick={() => onColorChange(hex)}
        >
          <span
            aria-hidden="true"
            className="h-16 w-full rounded-md border"
            style={{ backgroundColor: hex }}
          />
          <span className="font-mono text-xs">{hex}</span>
        </Button>
      ))}
    </div>
  );
}
function loadPalettes(): { palettes: SavedPalette[]; error: string } {
  try {
    return { palettes: parsePalettes(localStorage.getItem(paletteStorageKey)), error: "" };
  } catch {
    return {
      palettes: [],
      error:
        "No se pudieron leer las paletas guardadas. No se han sobrescrito. Puedes exportar la paleta actual.",
    };
  }
}
function Harmonies({ color, onColorChange }: ColorToolProps) {
  const [mode, setMode] = useState<Mode>("complementary");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [steps, setSteps] = useState("7");
  const [space, setSpace] = useState<"oklab" | "srgb">("oklab");
  const [name, setName] = useState("");
  const [format, setFormat] = useState<"json" | "css">("json");
  const [saved, setSaved] = useState(loadPalettes);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState<SavedPalette | null>(null);
  const stepCount = Number(steps);
  const invalidSteps = !Number.isInteger(stepCount) || stepCount < 2 || stepCount > 20;
  const end = endpoint ?? harmony(color, "complementary")[1]!;
  const colors =
    loaded?.colors ??
    (mode === "gradient"
      ? gradient(color, end, invalidSteps ? 7 : stepCount, space)
      : mode in harmonyOffsets
        ? harmony(color, mode as Harmony)
        : variation(color, mode as Variation));
  const paletteName = name.trim() || loaded?.name || modes.find(([id]) => id === mode)![1];
  const content = exportPalette(paletteName, colors, format);
  function persist(palettes: SavedPalette[]) {
    try {
      storePalettes(localStorage, palettes);
      setSaved({ palettes, error: "" });
      setError("");
      return true;
    } catch {
      setError(
        "No se pudieron guardar los cambios. Revisa el espacio o los permisos del almacenamiento local.",
      );
      return false;
    }
  }
  function save() {
    setMessage("");
    if (saved.error) {
      setError(
        "Las paletas existentes no se pudieron leer. Expórtalas o restablece el almacenamiento antes de guardar.",
      );
      return;
    }
    if (saved.palettes.length >= maxPalettes) {
      setError("Puedes guardar hasta 20 paletas. Elimina una antes de añadir otra.");
      return;
    }
    if (persist([...saved.palettes, { id: crypto.randomUUID(), name: paletteName, colors }]))
      setMessage("Paleta guardada en este equipo.");
  }
  async function copy() {
    setMessage("");
    setError("");
    try {
      await navigator.clipboard.writeText(content);
      setMessage("Paleta copiada.");
    } catch {
      setError(
        "No se pudo copiar. Selecciona el texto de exportación y cópialo manualmente, o descarga el archivo.",
      );
    }
  }
  function download() {
    setMessage("");
    setError("");
    try {
      const url = URL.createObjectURL(
        new Blob([content], { type: format === "json" ? "application/json" : "text/css" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `paleta.${format}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("No se pudo preparar la descarga. Usa el texto de exportación.");
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="harmony-mode">Tipo de paleta</FieldLabel>
          <NativeSelect
            id="harmony-mode"
            className="w-full"
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as Mode);
              setLoaded(null);
            }}
          >
            {modes.map(([id, label]) => (
              <NativeSelectOption key={id} value={id}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>
            Armonías calculadas por ángulos HSL. Las mezclas con blanco, negro y gris usan sRGB.
          </FieldDescription>
        </Field>
        {mode === "gradient" && (
          <>
            <Field>
              <FieldLabel htmlFor="harmony-end">Color final</FieldLabel>
              <Input
                id="harmony-end"
                type="color"
                value={end}
                onChange={(event) => {
                  setEndpoint(event.target.value);
                  setLoaded(null);
                }}
              />
              <Button
                variant="ghost"
                className="self-start"
                onClick={() => {
                  setEndpoint(null);
                  setLoaded(null);
                }}
              >
                Usar complementario
              </Button>
            </Field>
            <Field>
              <FieldLabel id="harmony-space">Interpolación</FieldLabel>
              <ToggleGroup
                type="single"
                value={space}
                aria-labelledby="harmony-space"
                onValueChange={(value) => {
                  if (value === "oklab" || value === "srgb") {
                    setSpace(value);
                    setLoaded(null);
                  }
                }}
              >
                <ToggleGroupItem value="oklab">Oklab</ToggleGroupItem>
                <ToggleGroupItem value="srgb">sRGB</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field data-invalid={invalidSteps}>
              <FieldLabel htmlFor="harmony-steps">Número de pasos</FieldLabel>
              <Input
                id="harmony-steps"
                type="number"
                min={2}
                max={20}
                step={1}
                value={steps}
                aria-invalid={invalidSteps}
                aria-describedby="harmony-steps-help"
                onChange={(event) => {
                  setSteps(event.target.value);
                  setLoaded(null);
                }}
              />
              <FieldDescription id="harmony-steps-help">
                {invalidSteps
                  ? "Introduce un entero de 2 a 20. La vista usa 7 pasos mientras corriges el valor."
                  : "Incluye los dos extremos."}
              </FieldDescription>
            </Field>
          </>
        )}
      </FieldGroup>
      <Button
        variant="outline"
        className="self-start"
        onClick={() => {
          const bytes = crypto.getRandomValues(new Uint8Array(3));
          onColorChange(`#${Array.from(bytes, (v) => v.toString(16).padStart(2, "0")).join("")}`);
          setLoaded(null);
        }}
      >
        <Shuffle data-icon="inline-start" />
        Color aleatorio
      </Button>
      {loaded && (
        <Alert>
          <AlertDescription>
            Paleta guardada: {loaded.name}.{" "}
            <Button variant="link" onClick={() => setLoaded(null)}>
              Volver al color compartido
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Swatches colors={colors} onColorChange={onColorChange} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="harmony-name">Nombre de la paleta</FieldLabel>
          <Input
            id="harmony-name"
            value={name}
            maxLength={64}
            placeholder={paletteName}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button onClick={save}>
          <Save data-icon="inline-start" />
          Guardar paleta
        </Button>
        <Button variant="outline" onClick={() => void copy()}>
          <Copy data-icon="inline-start" />
          Copiar {format.toUpperCase()}
        </Button>
        <Button variant="outline" onClick={download}>
          <Download data-icon="inline-start" />
          Descargar
        </Button>
      </div>
      {(error || saved.error) && (
        <Alert variant="destructive">
          <AlertDescription>{error || saved.error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel id="harmony-export-format">Formato de exportación</FieldLabel>
          <ToggleGroup
            type="single"
            value={format}
            aria-labelledby="harmony-export-format"
            onValueChange={(value) => {
              if (value === "json" || value === "css") setFormat(value);
            }}
          >
            <ToggleGroupItem value="json">JSON</ToggleGroupItem>
            <ToggleGroupItem value="css">CSS</ToggleGroupItem>
          </ToggleGroup>
          <Textarea
            aria-label="Texto de exportación de la paleta"
            value={content}
            readOnly
            rows={5}
            className="font-mono"
          />
        </Field>
      </FieldGroup>
      <Separator />
      <h3 className="text-base font-semibold">
        Paletas guardadas · {saved.palettes.length}/{maxPalettes}
      </h3>
      {saved.palettes.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay paletas guardadas en este equipo.</p>
      )}
      {saved.palettes.map((palette) => (
        <Card key={palette.id}>
          <CardHeader>
            <CardTitle className="wrap-anywhere">{palette.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Swatches colors={palette.colors} onColorChange={onColorChange} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLoaded(palette);
                  setName(palette.name);
                }}
              >
                Cargar paleta
              </Button>
              <Button
                variant="ghost"
                aria-label={`Eliminar paleta ${palette.name}`}
                onClick={() => {
                  if (
                    persist(saved.palettes.filter((item) => item.id !== palette.id)) &&
                    loaded?.id === palette.id
                  )
                    setLoaded(null);
                }}
              >
                <Trash2 data-icon="inline-start" />
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
export default {
  id: "harmonies",
  name: "Armonías y paletas",
  description: "Combina colores, crea degradados y guarda paletas en este equipo.",
  order: 20,
  Component: Harmonies,
} satisfies ColorTool;
