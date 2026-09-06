import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { UpdateController } from "./updateController";

export interface UpdaterOptions {
  enabled: boolean;
  intervalHours: number;
  busy: boolean;
}

export function useUpdater({ enabled, intervalHours, busy }: UpdaterOptions) {
  // The action reads the current render's busy value, not a delayed effect.
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const [controller] = useState(() => new UpdateController(isTauri() ? { check } : null, () => busyRef.current));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);

  useEffect(() => {
    controller.configureAutomatic(enabled, intervalHours);
  }, [controller, enabled, intervalHours]);

  const blocked = busy && snapshot.status === "ready";
  return {
    ...snapshot,
    canAct: snapshot.canAct && !blocked,
    detail: blocked ? "Termina el procesamiento del PDF antes de reiniciar e instalar." : snapshot.detail,
    action: controller.action,
  };
}
