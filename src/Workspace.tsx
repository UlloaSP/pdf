import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Feature } from "./features";

interface Result {
  ok: boolean;
  outputs: string[];
  error: string | null;
}

export function Workspace({
  feature,
  onClose,
}: {
  feature: Feature;
  onClose: () => void;
}) {
  const [inputs, setInputs] = useState<string[]>([]);
  const [destination, setDestination] = useState("");
  const [options, setOptions] = useState<
    Record<string, string | number | boolean>
  >(() =>
    Object.fromEntries(
      feature.fields.map((field) => [
        field.key,
        field.default ?? (field.type === "checkbox" ? false : ""),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outputs, setOutputs] = useState<string[]>([]);
  async function chooseFiles() {
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
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) setDestination(selected);
    } catch (reason) {
      setError(String(reason));
    }
  }
  async function run() {
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
      if (!result.ok)
        throw new Error(result.error ?? "No se pudo completar la operación.");
      setOutputs(result.outputs);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="workspace" aria-labelledby="workspace-title">
      <button onClick={onClose} disabled={busy}>
        ← Volver al catálogo
      </button>
      <h2 id="workspace-title">{feature.name}</h2>
      <p>{feature.description}</p>
      {feature.requirements.length ? (
        <p className="notice">
          Motor adicional necesario: {feature.requirements.join(", ")}. Debe
          estar instalado para ejecutar esta utilidad.
        </p>
      ) : null}
      {!isTauri() ? (
        <p className="notice">
          Abre la aplicación de escritorio para seleccionar y procesar archivos.
        </p>
      ) : null}
      <fieldset disabled={busy || !isTauri()}>
        <legend>Archivos y opciones</legend>
        <button onClick={chooseFiles}>Seleccionar archivos</button>
        <ol className="file-list">
          {inputs.map((path, index) => (
            <li key={`${path}-${index}`}>
              <span>{path}</span>
              <button
                aria-label={`Subir archivo ${index + 1}`}
                disabled={index === 0}
                onClick={() =>
                  setInputs((current) => {
                    const next = [...current];
                    [next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ];
                    return next;
                  })
                }
              >
                ↑
              </button>
              <button
                aria-label={`Quitar archivo ${index + 1}`}
                onClick={() =>
                  setInputs((current) =>
                    current.filter((_, at) => at !== index),
                  )
                }
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        {feature.fields.map((field) => (
          <label className="option" key={field.key}>
            <span>{field.label}</span>
            {field.type === "select" ? (
              <select
                value={String(options[field.key])}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
              >
                {field.options?.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={String(options[field.key])}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
              />
            ) : (
              <input
                type={field.type}
                checked={
                  field.type === "checkbox"
                    ? Boolean(options[field.key])
                    : undefined
                }
                value={
                  field.type === "checkbox"
                    ? undefined
                    : String(options[field.key])
                }
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    [field.key]:
                      field.type === "checkbox"
                        ? event.target.checked
                        : field.type === "number" && event.target.value !== ""
                          ? Number(event.target.value)
                          : event.target.value,
                  }))
                }
              />
            )}
          </label>
        ))}
        <button onClick={chooseDestination}>Elegir carpeta de destino</button>
        <p className="destination">
          {destination || "Sin carpeta seleccionada"}
        </p>
        <p>Se creará una subcarpeta nueva. Los originales se conservan.</p>
        <button className="primary" onClick={run} disabled={!destination}>
          Ejecutar {feature.name}
        </button>
      </fieldset>
      {busy ? (
        <div role="status">
          <progress /> Procesando…{" "}
          <button
            onClick={() =>
              invoke("cancel_job").catch((reason) => setError(String(reason)))
            }
          >
            Cancelar
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {outputs.length ? (
        <div role="status">
          <h3>Archivos guardados</h3>
          <ul>
            {outputs.map((path) => (
              <li className="destination" key={path}>
                {path}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
