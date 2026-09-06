import { useMemo, useState } from "react";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import type { ColorTool, ColorToolProps } from "../types";
import {
  adjustHsl,
  cssNames,
  formatCoordinate,
  inspectColor,
  parseInspectorInput,
} from "../inspector";

function Inspector({ color, onColorChange }: ColorToolProps) {
  const data = useMemo(() => inspectColor(color), [color]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copiado al portapapeles.");
    } catch {
      setMessage("No se pudo copiar. Selecciona el texto y usa Ctrl+C.");
    }
  }
  const representations = [
    ["HEX", data.hex],
    ["RGB 8 bits", data.bytes.join(", ")],
    [
      "RGB porcentual",
      data.bytes.map((value) => `${formatCoordinate((value / 255) * 100)}%`).join(", "),
    ],
    ["CMY aproximado", data.cmy.map((value) => `${formatCoordinate(value * 100)}%`).join(", ")],
    ["CMYK aproximado", data.cmyk.map((value) => `${formatCoordinate(value * 100)}%`).join(", ")],
    ["Decimal RGB24", String(data.decimal)],
    ["Binario R G B", data.binary],
    ["Android ARGB", data.androidHex],
    ["Android int firmado", String(data.androidSigned)],
    ["LRV aproximado · Y × 100", formatCoordinate(data.lrv)],
  ];
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <FieldSet>
        <FieldLegend>Explorar y ajustar</FieldLegend>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="inspector-css">Introducir otro color CSS</FieldLabel>
            <Input
              id="inspector-css"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="red, rgb(99 93 215), oklch(60% 0.2 280)"
              aria-invalid={!!error}
              aria-describedby="inspector-input-help"
              maxLength={500}
            />
            <FieldDescription id="inspector-input-help">
              Solo colores opacos. Se convierten a sRGB de 8 bits; los colores fuera de su gama se
              aproximan mediante el método CSS de Color.js.
            </FieldDescription>
            <Button
              className="self-start"
              onClick={() => {
                try {
                  const result = parseInspectorInput(input);
                  onColorChange(result.hex);
                  setError("");
                  setMessage(
                    result.mapped
                      ? "Color aproximado a la gama sRGB."
                      : "Color convertido a sRGB de 8 bits.",
                  );
                } catch (reason) {
                  setError(reason instanceof Error ? reason.message : "Color inválido.");
                }
              }}
            >
              Aplicar color CSS
            </Button>
          </Field>
          <Field>
            <FieldLabel htmlFor="inspector-names">
              Colores CSS con nombre · {cssNames.length}
            </FieldLabel>
            <NativeSelect
              id="inspector-names"
              className="w-full"
              value={data.exactNames[0] ?? ""}
              onChange={(event) => {
                if (event.target.value) onColorChange(parseInspectorInput(event.target.value).hex);
              }}
            >
              <NativeSelectOption value="">Sin nombre CSS exacto</NativeSelectOption>
              {cssNames.map((name) => (
                <NativeSelectOption key={name} value={name}>
                  {name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>
              {data.exactNames.length
                ? `Nombres exactos: ${data.exactNames.join(", ")}`
                : `Más cercano: ${data.nearest.name} · ΔE2000 ${formatCoordinate(data.nearest.delta)} (aproximación).`}
            </FieldDescription>
          </Field>
          {(["Matiz", "Saturación", "Luminosidad"] as const).map((label, index) => (
            <Field key={label}>
              <FieldLabel id={`inspector-hsl-${index}`}>
                {label} HSL · {formatCoordinate(data.hsl[index])}
                {index === 0 ? "°" : "%"}
              </FieldLabel>
              <Slider
                aria-labelledby={`inspector-hsl-${index}`}
                min={0}
                max={index === 0 ? 360 : 100}
                step={1}
                value={[
                  data.hsl[index] !== null && Number.isFinite(data.hsl[index])
                    ? data.hsl[index]
                    : 0,
                ]}
                onValueChange={([value]) => {
                  if (value !== undefined) onColorChange(adjustHsl(color, index, value));
                }}
              />
            </Field>
          ))}
          <FieldDescription>
            Al añadir saturación a un gris sin matiz se parte de 0°. Los ajustes se redondean a RGB
            de 8 bits.
          </FieldDescription>
        </FieldGroup>
      </FieldSet>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {representations.map(([label, value]) => (
          <Card key={label} className="min-w-0">
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent className="flex min-w-0 items-start gap-2">
              <code className="min-w-0 flex-1 break-all select-text">{value}</code>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Copiar ${label}`}
                onClick={() => void copy(value)}
              >
                <CopyIcon />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Alert role="note">
        <AlertDescription>
          CMY/CMYK son fórmulas sin perfil ICC. LRV se estima de la luminancia relativa sRGB: no
          mide la reflectancia de una pintura física.
        </AlertDescription>
      </Alert>
      <Field>
        <FieldLabel>Color websafe más cercano por canal</FieldLabel>
        <Button
          variant="outline"
          className="self-start"
          onClick={() => onColorChange(data.websafe)}
        >
          Usar {data.websafe}
        </Button>
        <FieldDescription>
          Paleta de 216 colores: cada canal se redondea a 0, 51, 102, 153, 204 o 255.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="inspector-space-filter">
          Espacios de color · {data.spaces.length}
        </FieldLabel>
        <Input
          id="inspector-space-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Buscar Lab, CAM16, RGB…"
        />
      </Field>
      <p className="text-sm text-muted-foreground">
        Coordenadas nativas sin recortar. Rangos de referencia entre paréntesis; — indica una
        coordenada no definida. Lab/LCH usan D50, salvo indicación D65. Los modelos de apariencia y
        HDR usan las condiciones predeterminadas de Color.js.
      </p>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {data.spaces
          .filter((space) =>
            `${space.id} ${space.name}`.toLowerCase().includes(filter.toLowerCase()),
          )
          .map((space) => (
            <Card key={space.id} className="min-w-0">
              <CardHeader>
                <CardTitle>{space.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex min-w-0 flex-col gap-2">
                <dl className="flex flex-col gap-2">
                  {space.coordinates.map((coordinate) => (
                    <div
                      key={coordinate.id}
                      className="flex flex-wrap justify-between gap-2 text-sm"
                    >
                      <dt>
                        {coordinate.name}{" "}
                        {coordinate.range && (
                          <span className="text-muted-foreground">
                            ({coordinate.range.join("…")})
                          </span>
                        )}
                      </dt>
                      <dd className="font-mono select-text">
                        {formatCoordinate(coordinate.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {!space.inGamut && (
                  <p className="text-sm text-muted-foreground">
                    Fuera de gama; valores sin recortar.
                  </p>
                )}
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() =>
                    void copy(
                      `${space.id}: ${space.coordinates.map((coordinate) => `${coordinate.id}=${formatCoordinate(coordinate.value)}`).join(", ")}`,
                    )
                  }
                >
                  Copiar coordenadas
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
      <FieldSet>
        <FieldLegend>Ejemplos CSS</FieldLegend>
        <FieldGroup>
          {data.css.map((example) => (
            <Field key={example} orientation="horizontal">
              <code className="min-w-0 flex-1 break-all select-text">{example}</code>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Copiar ${example}`}
                onClick={() => void copy(example)}
              >
                <CopyIcon />
              </Button>
            </Field>
          ))}
        </FieldGroup>
      </FieldSet>
    </div>
  );
}

export default {
  id: "inspector",
  name: "Inspector y conversiones",
  description: "Espacios de color, códigos, nombres CSS, websafe y ajustes HSL. Cálculos locales.",
  order: 10,
  Component: Inspector,
} satisfies ColorTool;
