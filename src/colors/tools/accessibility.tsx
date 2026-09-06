import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { ColorTool, ColorToolProps } from "../types";
import { normalizeHex } from "../hex";
import { contrastRatio, contrastChecks, simulateVision, visionModes } from "../accessibility";

export function Accessibility({ color, onColorChange }: ColorToolProps) {
  const [background, setBackground] = useState("#ffffff");
  const [draft, setDraft] = useState(background);
  const invalid = !normalizeHex(draft);
  const ratio = contrastRatio(color, background);
  const checks = contrastChecks(ratio);
  function changeBackground(value: string) {
    setDraft(value);
    const normalized = normalizeHex(value);
    if (normalized) setBackground(normalized);
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Contraste del texto</CardTitle>
          <CardDescription>
            El color compartido se usa como texto. Elige un fondo para comparar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldSet>
            <FieldLegend>Color de fondo</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="contrast-background-picker">Selector de fondo</FieldLabel>
                <Input
                  id="contrast-background-picker"
                  type="color"
                  value={background}
                  onChange={(e) => changeBackground(e.target.value)}
                  className="w-20"
                />
              </Field>
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor="contrast-background-hex">Fondo HEX</FieldLabel>
                <Input
                  id="contrast-background-hex"
                  value={draft}
                  aria-invalid={invalid}
                  aria-describedby="contrast-background-help"
                  onChange={(e) => changeBackground(e.target.value)}
                />
                <FieldDescription id="contrast-background-help">
                  {invalid
                    ? "Usa #RGB o #RRGGBB. Se conserva el último fondo válido."
                    : "Colores sRGB opacos, sin transparencia."}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
          <div
            className="rounded-lg border p-6"
            style={{ color, backgroundColor: background }}
            aria-label={`Vista previa: texto ${color} sobre ${background}`}
          >
            <p className="text-2xl font-semibold">Cada palabra cuenta.</p>
            <p className="mt-2 text-base">Comprueba que tu mensaje se pueda leer.</p>
          </div>
          <p role="status" className="text-3xl font-semibold tabular-nums">
            {ratio.toFixed(2)}:1
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Resultados WCAG">
            {[
              ["AA normal · 4.5:1", checks.aa],
              ["AA grande · 3:1", checks.aaLarge],
              ["AAA normal · 7:1", checks.aaa],
              ["AAA grande · 4.5:1", checks.aaaLarge],
            ].map(([label, pass]) => (
              <li key={String(label)}>
                <Badge variant={pass ? "secondary" : "outline"}>
                  {String(label)}: {pass ? "Cumple" : "No cumple"}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Texto grande: al menos 24 px, o aproximadamente 18.67 px en negrita. El resultado usa el
            valor sin redondear. Este cálculo no certifica la accesibilidad de toda la interfaz.
          </p>
        </CardContent>
      </Card>
      <section className="flex flex-col gap-3" aria-labelledby="vision-title">
        <h3 id="vision-title" className="text-lg font-semibold">
          Ocho simulaciones de visión
        </h3>
        <p className="text-sm text-muted-foreground">
          Aproximaciones visuales, no un diagnóstico. Machado para las deficiencias cromáticas;
          luminancia para acromatopsia y mezcla lineal del 50 % para acromatomalía. Selecciona una
          muestra para usar su color.
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visionModes.map(([mode, label]) => {
            const simulated = simulateVision(color, mode);
            return (
              <li key={mode}>
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 py-3"
                  onClick={() => onColorChange(simulated)}
                  aria-label={`Usar ${label}: ${simulated}`}
                >
                  <span
                    aria-hidden="true"
                    className="size-12 shrink-0 rounded-md border"
                    style={{ backgroundColor: simulated }}
                  />
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    <span>{label}</span>
                    <span className="font-mono">{simulated}</span>
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
export default {
  id: "accessibility",
  name: "Accesibilidad",
  description: "Contraste WCAG AA y AAA, y ocho simulaciones de visión del color.",
  order: 30,
  Component: Accessibility,
} satisfies ColorTool;
