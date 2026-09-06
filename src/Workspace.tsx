import { useEffect, useId, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { AppSettings } from "./appSettings";
import type { Feature } from "./features";
import { ArrowLeftIcon, ArrowUpIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Result {
  ok: boolean;
  outputs: string[];
  error: string | null;
}

export function Workspace({
  settings,
  onRememberDestination,
  locked,
  feature,
  onClose,
  onBusyChange,
}: {
  settings: AppSettings;
  onRememberDestination: (path: string) => void;
  locked: boolean;
  feature: Feature;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [inputs, setInputs] = useState<string[]>([]);
  const [destination, setDestination] = useState(settings.defaultOutputDir);
  const [options, setOptions] = useState<Record<string, string | number | boolean>>(() =>
    Object.fromEntries(
      feature.fields.map((field) => [
        field.key,
        field.default ?? (field.type === "checkbox" ? false : ""),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const fieldId = useId();
  const desktop = isTauri();
  const disabled = busy || locked || !desktop;
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  const [error, setError] = useState("");
  const [outputs, setOutputs] = useState<string[]>([]);
  async function chooseFiles() {
    if (disabled) return;
    try {
      const selected = await open({
        multiple: feature.multiple,
        directory: false,
        filters: [{ name: "Documentos", extensions: feature.extensions }],
      });
      if (selected) setInputs(Array.isArray(selected) ? selected : [selected]);
    } catch (reason) {
      setError(String(reason));
    }
  }
  async function chooseDestination() {
    if (disabled) return;
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setDestination(selected);
        if (settings.rememberOutputDir) onRememberDestination(selected);
      }
    } catch (reason) {
      setError(String(reason));
    }
  }
  async function run() {
    if (disabled || !destination) return;
    onBusyChange(true);
    setBusy(true);
    setError("");
    setOutputs([]);
    try {
      const result = await invoke<Result>("run_tool", {
        request: {
          feature: feature.id,
          inputs,
          output_dir: destination,
          options,
        },
      });
      if (!result.ok) throw new Error(result.error ?? "No se pudo completar la operación.");
      setOutputs(result.outputs);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }
  function cancel() {
    if (busy && desktop) void invoke("cancel_job").catch((reason) => setError(String(reason)));
  }
  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-4"
      aria-labelledby="workspace-title"
    >
      <Button variant="ghost" className="self-start" onClick={onClose} disabled={busy || locked}>
        <ArrowLeftIcon data-icon="inline-start" /> Volver al catálogo
      </Button>
      <header className="flex flex-col gap-2">
        <h2 id="workspace-title" className="text-2xl font-semibold tracking-tight">
          {feature.name}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
      </header>
      {feature.requirements.length ? (
        <Alert role="note">
          <AlertTitle>Motor adicional necesario</AlertTitle>
          <AlertDescription>
            {feature.requirements.join(", ")}. Debe estar instalado para ejecutar esta utilidad.
          </AlertDescription>
        </Alert>
      ) : null}
      {!desktop ? (
        <Alert role="note">
          <AlertDescription>
            Abre la aplicación de escritorio para seleccionar y procesar archivos.
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldSet disabled={disabled}>
        <FieldLegend>Archivos y opciones</FieldLegend>
        <FieldGroup>
          <Field data-disabled={disabled}>
            <Button
              variant="outline"
              className="self-start"
              onClick={chooseFiles}
              disabled={disabled}
            >
              Seleccionar archivos
            </Button>
            {inputs.length ? (
              <ol className="flex min-w-0 flex-col gap-2" aria-label="Archivos seleccionados">
                {inputs.map((path, index) => (
                  <li
                    key={`${path}-${index}`}
                    className="flex min-w-0 items-center gap-2 rounded-lg border p-2"
                  >
                    <span className="min-w-0 flex-1 break-all text-sm">{path}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Subir archivo ${index + 1}`}
                      disabled={disabled || index === 0}
                      onClick={() =>
                        setInputs((current) => {
                          const next = [...current];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          return next;
                        })
                      }
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar archivo ${index + 1}`}
                      disabled={disabled}
                      onClick={() =>
                        setInputs((current) => current.filter((_, at) => at !== index))
                      }
                    >
                      <XIcon />
                    </Button>
                  </li>
                ))}
              </ol>
            ) : null}
          </Field>
          {feature.fields.map((field) => {
            const id = `${fieldId}-${field.key}`;
            const change = (value: string | number | boolean) =>
              setOptions((current) => ({ ...current, [field.key]: value }));
            return (
              <Field
                key={field.key}
                data-disabled={disabled}
                orientation={field.type === "checkbox" ? "horizontal" : "vertical"}
              >
                {field.type === "checkbox" ? (
                  <>
                    <Checkbox
                      id={id}
                      disabled={disabled}
                      checked={Boolean(options[field.key])}
                      onCheckedChange={(checked) => change(checked === true)}
                    />
                    <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
                  </>
                ) : (
                  <>
                    <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
                    {field.type === "select" ? (
                      <NativeSelect
                        id={id}
                        disabled={disabled}
                        className="w-full"
                        value={String(options[field.key])}
                        onChange={(event) => change(event.target.value)}
                      >
                        {field.options?.map((value) => (
                          <NativeSelectOption key={value} value={value}>
                            {value}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    ) : field.type === "textarea" ? (
                      <Textarea
                        id={id}
                        disabled={disabled}
                        rows={4}
                        value={String(options[field.key])}
                        onChange={(event) => change(event.target.value)}
                      />
                    ) : (
                      <Input
                        id={id}
                        disabled={disabled}
                        type={field.type}
                        value={String(options[field.key])}
                        onChange={(event) =>
                          change(
                            field.type === "number" && event.target.value !== ""
                              ? Number(event.target.value)
                              : event.target.value,
                          )
                        }
                      />
                    )}
                  </>
                )}
              </Field>
            );
          })}
          <Field data-disabled={disabled}>
            <Button
              variant="outline"
              className="self-start"
              onClick={chooseDestination}
              disabled={disabled}
            >
              Elegir carpeta de destino
            </Button>
            <p className="min-w-0 break-all text-sm">{destination || "Sin carpeta seleccionada"}</p>
            <FieldDescription>
              Se creará una subcarpeta nueva. Los originales se conservan.
            </FieldDescription>
          </Field>
          <Field>
            <Button
              className="h-auto min-h-8 whitespace-normal self-start"
              onClick={run}
              disabled={disabled || !destination}
            >
              Ejecutar {feature.name}
            </Button>
          </Field>
        </FieldGroup>
      </FieldSet>
      {busy ? (
        <div className="flex flex-wrap items-center gap-3">
          <span role="status" className="flex items-center gap-2 text-sm">
            <Spinner aria-hidden="true" /> Procesando…
          </span>
          {settings.confirmCancel ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar el procesamiento actual?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se detendrá esta operación. Los archivos originales se conservan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Seguir procesando</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={cancel}>
                    Cancelar procesamiento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="outline" onClick={cancel}>
              Cancelar
            </Button>
          )}
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo completar la operación</AlertTitle>
          <AlertDescription className="break-all">{error}</AlertDescription>
        </Alert>
      ) : null}
      {outputs.length ? (
        <Alert role="status">
          <AlertTitle>Archivos guardados</AlertTitle>
          <AlertDescription>
            <ul className="flex min-w-0 flex-col gap-1">
              {outputs.map((path) => (
                <li className="break-all" key={path}>
                  {path}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
