import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ColorTool, ColorToolProps } from "../types";
import {
  extractPalette,
  inspectImage,
  MAX_FILE_BYTES,
  MAX_IMAGE_PIXELS,
  pixelCoordinate,
  rgbHex,
  serializePalette,
  type PaletteColor,
} from "../extraction";

export function Extract({ onColorChange }: ColorToolProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const generation = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [pixel, setPixel] = useState<{ hex: string; alpha: number } | null>(null);
  useEffect(() => {
    const target = canvas.current;
    return () => {
      generation.current++;
      if (target) {
        target.width = 0;
        target.height = 0;
      }
    };
  }, []);
  async function load(file: File) {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    setLoaded(false);
    setPalette([]);
    setPixel(null);
    if (canvas.current) {
      canvas.current.width = 0;
      canvas.current.height = 0;
    }
    let bitmap: ImageBitmap | undefined;
    try {
      if (file.size > MAX_FILE_BYTES || file.size === 0)
        throw new Error("Selecciona una imagen de hasta 15 MiB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      inspectImage(bytes);
      if (current !== generation.current) return;
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      if (current !== generation.current) return;
      if (
        bitmap.width * bitmap.height > MAX_IMAGE_PIXELS ||
        bitmap.width > 16384 ||
        bitmap.height > 16384
      )
        throw new Error("La imagen decodificada supera el límite de tamaño.");
      const target = canvas.current;
      if (!target) return;
      const context = target.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" });
      if (!context) throw new Error("No se pudo abrir el lienzo local.");
      target.width = bitmap.width;
      target.height = bitmap.height;
      context.drawImage(bitmap, 0, 0);
      const sample = document.createElement("canvas");
      const scale = Math.min(1, 256 / bitmap.width, 256 / bitmap.height);
      sample.width = Math.max(1, Math.round(bitmap.width * scale));
      sample.height = Math.max(1, Math.round(bitmap.height * scale));
      const sampling = sample.getContext("2d", { colorSpace: "srgb" });
      if (!sampling) throw new Error("No se pudo analizar la imagen.");
      try {
        sampling.drawImage(bitmap, 0, 0, sample.width, sample.height);
        setPalette(extractPalette(sampling.getImageData(0, 0, sample.width, sample.height).data));
      } finally {
        sample.width = 0;
        sample.height = 0;
      }
      setPoint({ x: 0, y: 0 });
      setLoaded(true);
    } catch (reason) {
      if (current === generation.current)
        setError(reason instanceof Error ? reason.message : "No se pudo leer la imagen.");
    } finally {
      bitmap?.close();
      if (current === generation.current) setBusy(false);
    }
  }
  function pick(x: number, y: number, apply: boolean) {
    const context = canvas.current?.getContext("2d");
    if (!context || !loaded) return;
    const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
    const hex = rgbHex(r, g, b);
    setPoint({ x, y });
    setPixel({ hex, alpha: a });
    if (apply && a > 0) onColorChange(hex);
  }
  function download(format: "json" | "css") {
    const blob = new Blob([serializePalette(palette, format)], {
      type: format === "json" ? "application/json" : "text/css",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paleta.${format}`;
    document.body.append(link);
    link.click();
    link.remove();
    // Keep the blob alive through the browser's download navigation task.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="palette-file">Imagen local</FieldLabel>
          <Input
            id="palette-file"
            disabled={busy}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void load(file);
              event.target.value = "";
            }}
          />
          <FieldDescription>
            PNG, JPG o WEBP estático. Hasta 15 MiB y 12 megapíxeles. La imagen permanece en tu
            equipo.
          </FieldDescription>
        </Field>
      </FieldGroup>
      {busy && <p role="status">Leyendo imagen…</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div hidden={!loaded} className="flex flex-col gap-3">
        <p id="pixel-help" className="text-sm text-muted-foreground">
          Pulsa en la imagen para elegir un píxel. Con teclado: enfoca la imagen, usa las flechas y
          pulsa Enter para seleccionar. Shift mueve 10 píxeles.
        </p>
        <canvas
          ref={canvas}
          tabIndex={loaded ? 0 : -1}
          role="group"
          aria-label="Selector de píxel de la imagen"
          aria-describedby="pixel-help pixel-value"
          className="h-auto w-full rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            event.currentTarget.focus();
            pick(
              pixelCoordinate(event.clientX, rect.left, rect.width, event.currentTarget.width),
              pixelCoordinate(event.clientY, rect.top, rect.height, event.currentTarget.height),
              true,
            );
          }}
          onKeyDown={(event) => {
            const delta = event.shiftKey ? 10 : 1;
            let { x, y } = point;
            if (event.key === "ArrowLeft") x -= delta;
            else if (event.key === "ArrowRight") x += delta;
            else if (event.key === "ArrowUp") y -= delta;
            else if (event.key === "ArrowDown") y += delta;
            else if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            pick(
              Math.max(0, Math.min(event.currentTarget.width - 1, x)),
              Math.max(0, Math.min(event.currentTarget.height - 1, y)),
              event.key === "Enter" || event.key === " ",
            );
          }}
        />
        <p id="pixel-value" role="status" className="text-sm tabular-nums">
          {pixel
            ? `Píxel ${point.x}, ${point.y}: ${pixel.hex}, opacidad ${Math.round((pixel.alpha / 255) * 100)} %. ${pixel.alpha === 0 ? "Transparente: no se selecciona un color." : "El color compartido usa RGB sin alfa."}`
            : "Selecciona un píxel para ver sus valores."}
        </p>
        <h3 className="text-lg font-semibold">Colores predominantes</h3>
        <p className="text-sm text-muted-foreground">
          Hasta ocho grupos de una muestra reducida, ponderados por opacidad. Se ignoran píxeles
          transparentes. Los porcentajes pueden no sumar 100 % porque se muestran solo los grupos
          principales.
        </p>
        {!palette.length && <p>No hay colores visibles en la muestra.</p>}
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {palette.map((item) => (
            <li key={item.hex}>
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-3 py-3"
                onClick={() => onColorChange(item.hex)}
                aria-label={`Usar color ${item.hex}`}
              >
                <span
                  aria-hidden="true"
                  className="size-10 rounded-md border"
                  style={{ backgroundColor: item.hex }}
                />
                <span className="font-mono">{item.hex}</span>
                <span>{(item.share * 100).toFixed(1)} %</span>
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!palette.length} onClick={() => download("json")}>
            Exportar JSON
          </Button>
          <Button variant="outline" disabled={!palette.length} onClick={() => download("css")}>
            Exportar CSS
          </Button>
        </div>
      </div>
    </div>
  );
}
export default {
  id: "extract",
  name: "Extraer de imagen",
  description: "Paleta local, cuentagotas por píxel y exportación JSON o CSS.",
  order: 40,
  Component: Extract,
} satisfies ColorTool;
