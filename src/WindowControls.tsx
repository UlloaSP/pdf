import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

function NativeWindowControls() {
  const [nativeWindow] = useState(getCurrentWindow);
  const [maximized, setMaximized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    let request = 0;

    async function refresh() {
      const currentRequest = ++request;
      try {
        const value = await nativeWindow.isMaximized();
        if (!disposed && currentRequest === request) setMaximized(value);
      } catch {
        if (!disposed) setError("No se pudo consultar el estado de la ventana.");
      }
    }

    void nativeWindow
      .onResized(() => void refresh())
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(() => {
        if (!disposed) setError("No se pudo seguir el estado de la ventana.");
      });
    void refresh();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [nativeWindow]);

  async function perform(action: () => Promise<void>, message: string) {
    setError(null);
    try {
      await action();
    } catch {
      setError(message);
    }
  }

  const maximizeLabel = maximized ? "Restaurar ventana" : "Maximizar ventana";

  return (
    <div className="window-controls" role="group" aria-label="Controles de la ventana">
      {error ? <span className="window-control-error" role="status">{error}</span> : null}
      <button
        className="window-control"
        type="button"
        aria-label="Minimizar ventana"
        title="Minimizar ventana"
        onClick={() => void perform(() => nativeWindow.minimize(), "No se pudo minimizar la ventana.")}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M1 6h10" />
        </svg>
      </button>
      <button
        className="window-control"
        type="button"
        aria-label={maximizeLabel}
        title={maximizeLabel}
        onClick={() => void perform(() => nativeWindow.toggleMaximize(), "No se pudo cambiar el tamaño de la ventana.")}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true">
          {maximized ? <path d="M3.5 3.5v-2h7v7h-2m-7-5h7v7h-7z" /> : <rect x="1.5" y="1.5" width="9" height="9" />}
        </svg>
      </button>
      <button
        className="window-control window-control-close"
        type="button"
        aria-label="Cerrar ventana"
        title="Cerrar ventana"
        onClick={() => void perform(() => nativeWindow.close(), "No se pudo cerrar la ventana.")}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="m1.5 1.5 9 9m0-9-9 9" />
        </svg>
      </button>
    </div>
  );
}

export function WindowControls() {
  return isTauri() ? <NativeWindowControls /> : null;
}
