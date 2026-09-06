import type { DownloadEvent } from "@tauri-apps/plugin-updater";

export type UpdateStatus = "unavailable" | "idle" | "checking" | "current" | "no-release" | "available" | "downloading" | "ready" | "installing" | "error";

export interface UpdateHandle {
  version: string;
  download(onEvent: (event: DownloadEvent) => void, options: { timeout: number }): Promise<void>;
  install(options: { restartAfterInstall: boolean }): Promise<void>;
  close(): Promise<void>;
}

export interface UpdaterAdapter {
  check(options: { timeout: number }): Promise<UpdateHandle | null>;
}

export interface UpdateSnapshot {
  status: UpdateStatus;
  label: string;
  detail: string;
  version?: string;
  /** Percentage, undefined when the server does not provide a content length. */
  progress?: number;
  canAct: boolean;
  lastChecked: number | null;
  installing: boolean;
}

const labels: Record<UpdateStatus, string> = {
  unavailable: "No disponible", idle: "Comprobar", checking: "Comprobando…",
  current: "Listo", "no-release": "Comprobar", available: "Descargar",
  downloading: "Descargando…", ready: "Reiniciar e instalar",
  installing: "Instalando…", error: "Comprobar",
};
const automaticStates: UpdateStatus[] = ["idle", "current", "no-release", "error"];

/** Owns one native update resource and one operation at a time. No automatic installs. */
export class UpdateController {
  private snapshot: UpdateSnapshot;
  private listeners = new Set<() => void>();
  private update: UpdateHandle | null = null;
  private active = false;
  private running = false;
  private generation = 0;
  private initialTimer?: ReturnType<typeof setTimeout>;
  private periodicTimer?: ReturnType<typeof setInterval>;

  constructor(private adapter: UpdaterAdapter | null, private isBusy: () => boolean = () => false) {
    this.snapshot = this.initialSnapshot();
  }

  private initialSnapshot(): UpdateSnapshot {
    const status = this.adapter ? "idle" : "unavailable";
    return { status, label: labels[status], detail: this.adapter ? "Comprueba si hay una nueva versión." : "Las actualizaciones están disponibles en la aplicación de Windows.", canAct: false, lastChecked: null, installing: false };
  }

  getSnapshot = (): UpdateSnapshot => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(changes: Partial<UpdateSnapshot>) {
    const next = { ...this.snapshot, ...changes };
    next.label = labels[next.status];
    next.installing = next.status === "installing";
    next.canAct = this.active && !!this.adapter && !this.running && next.status !== "installing";
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }

  start() {
    this.active = true;
    this.generation++;
    this.publish(this.initialSnapshot());
  }

  configureAutomatic(enabled: boolean, intervalHours: number) {
    clearTimeout(this.initialTimer);
    clearInterval(this.periodicTimer);
    if (!this.active || !this.adapter || !enabled) return;
    const hours = [1, 6, 24].includes(intervalHours) ? intervalHours : 6;
    const check = () => {
      if (automaticStates.includes(this.snapshot.status)) void this.action();
    };
    this.initialTimer = setTimeout(check, 20_000);
    this.periodicTimer = setInterval(check, hours * 3_600_000);
  }

  stop() {
    this.active = false;
    this.generation++;
    clearTimeout(this.initialTimer);
    clearInterval(this.periodicTimer);
    // A pending download can still create a byte resource. Close it only after settling.
    if (!this.running) this.release();
  }

  private release() {
    const handle = this.update;
    this.update = null;
    if (handle) void handle.close().catch(() => { /* The webview may already be gone. */ });
  }

  action = async (): Promise<void> => {
    if (!this.active || !this.adapter || this.running || this.snapshot.status === "installing") return;
    if (this.snapshot.status === "ready" && this.isBusy()) return;
    const generation = this.generation;
    const status = this.snapshot.status;
    this.running = true;
    try {
      if (status === "ready" && this.update) {
        this.publish({ status: "installing", detail: "Windows cerrará la aplicación para instalar y volver a abrirla." });
        // The native installer exits Windows only after successfully launching.
        await this.update.install({ restartAfterInstall: true });
      } else if (status === "available" && this.update) {
        this.publish({ status: "downloading", detail: "Descargando la actualización firmada…", progress: undefined });
        let received = 0;
        let total: number | undefined;
        await this.update.download((event) => {
          if (!this.active || generation !== this.generation) return;
          if (event.event === "Started") {
            received = 0;
            total = event.data.contentLength;
          } else if (event.event === "Progress") {
            received += event.data.chunkLength;
          }
          const progress = total ? Math.min(100, Math.round(received / total * 100)) : undefined;
          if (event.event !== "Finished" && progress !== this.snapshot.progress) this.publish({ progress });
          // Finished means bytes arrived; signature validation happens after this event.
        }, { timeout: 300_000 });
        if (this.active && generation === this.generation) this.publish({ status: "ready", progress: 100, detail: "Descarga verificada. Reinicia para instalar la actualización." });
      } else {
        this.publish({ status: "checking", detail: "Consultando las versiones publicadas…", progress: undefined });
        const result = await this.adapter.check({ timeout: 20_000 });
        this.update = result;
        if (this.active && generation === this.generation) this.publish({ status: result ? "available" : "current", version: result?.version, lastChecked: Date.now(), detail: result ? `La versión ${result.version} está disponible.` : "Tienes la última versión publicada." });
      }
    } catch (error) {
      if (this.active && generation === this.generation) {
        const message = error instanceof Error ? error.message : String(error);
        if (status === "ready") {
          this.publish({ status: "ready", detail: "No se pudo iniciar el instalador. Puedes volver a intentarlo." });
        } else if (status === "available") {
          this.publish({ status: "available", progress: undefined, detail: "No se pudo descargar o verificar la actualización. Vuelve a descargarla." });
        } else {
          const explicit404 = /\b404\b/.test(message);
          // Tauri currently masks non-2xx HTTP codes as ReleaseNotFound. Do not
          // misreport a 500 or forbidden request as a confirmed missing release.
          const noManifest = /release.*not.*found|could not fetch a valid release json/i.test(message);
          this.publish({ status: explicit404 ? "no-release" : "error", lastChecked: Date.now(), detail: explicit404 ? "Todavía no hay una versión publicada." : noManifest ? "No se encontró un manifiesto de actualización. Puede que aún no haya una versión publicada o que el servidor no esté disponible." : "No se pudo comprobar la actualización. Comprueba la conexión e inténtalo de nuevo." });
        }
      }
    } finally {
      this.running = false;
      if (!this.active || generation !== this.generation) {
        this.release();
        if (this.active) this.publish(this.initialSnapshot());
      } else {
        this.publish({});
      }
    }
  };
}
