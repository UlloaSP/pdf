import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { UpdateController, type UpdateHandle, type UpdaterAdapter } from "../src/updateController";
import type { DownloadEvent } from "@tauri-apps/plugin-updater";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture() {
  const handle = {
    version: "0.2.0",
    download: vi.fn<UpdateHandle["download"]>().mockResolvedValue(undefined),
    install: vi.fn<UpdateHandle["install"]>().mockResolvedValue(undefined),
    close: vi.fn<UpdateHandle["close"]>().mockResolvedValue(undefined),
  };
  const adapter = { check: vi.fn<UpdaterAdapter["check"]>().mockResolvedValue(handle) };
  let busy = false;
  const controller = new UpdateController(adapter, () => busy);
  controller.start();
  return { controller, adapter, handle, setBusy: (value: boolean) => { busy = value; } };
}

describe("UpdateController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("checks, downloads with progress, then installs only on another action", async () => {
    const { controller, adapter, handle } = fixture();
    handle.download.mockImplementation(async (report) => {
      report({ event: "Started", data: { contentLength: 100 } });
      report({ event: "Progress", data: { chunkLength: 35 } });
      expect(controller.getSnapshot().progress).toBe(35);
      report({ event: "Finished" });
      expect(controller.getSnapshot().status).toBe("downloading");
    });
    await controller.action();
    expect(adapter.check).toHaveBeenCalledWith({ timeout: 20_000 });
    expect(controller.getSnapshot()).toMatchObject({ status: "available", label: "Descargar", version: "0.2.0", canAct: true });
    await controller.action();
    expect(handle.download.mock.calls[0][1]).toEqual({ timeout: 300_000 });
    expect(controller.getSnapshot()).toMatchObject({ status: "ready", progress: 100, label: "Reiniciar e instalar" });
    expect(handle.install).not.toHaveBeenCalled();
    await controller.action();
    expect(handle.install).toHaveBeenCalledExactlyOnceWith({ restartAfterInstall: true });
    expect(controller.getSnapshot()).toMatchObject({ status: "installing", installing: true, canAct: false });
    controller.stop();
  });

  it("never calls native operations in a browser", async () => {
    const controller = new UpdateController(null);
    controller.start();
    controller.configureAutomatic(true, 1);
    await controller.action();
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(controller.getSnapshot()).toMatchObject({ status: "unavailable", canAct: false, lastChecked: null });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits 20 seconds and repeats at the configured interval", async () => {
    const { controller, adapter } = fixture();
    adapter.check.mockResolvedValue(null);
    controller.configureAutomatic(true, 1);
    await vi.advanceTimersByTimeAsync(19_999);
    expect(adapter.check).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(adapter.check).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({ status: "current", label: "Listo" });
    await vi.advanceTimersByTimeAsync(3_580_000);
    expect(adapter.check).toHaveBeenCalledTimes(2);
    controller.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disables auto checks while preserving manual checking", async () => {
    const { controller, adapter } = fixture();
    controller.configureAutomatic(true, 1);
    controller.configureAutomatic(false, 1);
    await vi.advanceTimersByTimeAsync(24 * 3_600_000);
    expect(adapter.check).not.toHaveBeenCalled();
    await controller.action();
    expect(adapter.check).toHaveBeenCalledTimes(1);
  });

  it("preserves available and downloaded updates across automatic checks", async () => {
    const { controller, adapter, handle } = fixture();
    controller.configureAutomatic(true, 1);
    await controller.action();
    await vi.advanceTimersByTimeAsync(2 * 3_600_000);
    expect(adapter.check).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().status).toBe("available");
    await controller.action();
    await vi.advanceTimersByTimeAsync(2 * 3_600_000);
    expect(adapter.check).toHaveBeenCalledTimes(1);
    expect(handle.install).not.toHaveBeenCalled();
    expect(controller.getSnapshot().status).toBe("ready");
    controller.stop();
  });

  it("does not overlap repeated actions or timer requests", async () => {
    const { controller, adapter } = fixture();
    const pending = deferred<UpdateHandle | null>();
    adapter.check.mockReturnValue(pending.promise);
    controller.configureAutomatic(true, 1);
    const action = controller.action();
    await controller.action();
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(adapter.check).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().canAct).toBe(false);
    pending.resolve(null);
    await action;
    expect(controller.getSnapshot().canAct).toBe(true);
    controller.stop();
  });

  it("uses the live busy guard and permits retry once processing finishes", async () => {
    const { controller, handle, setBusy } = fixture();
    await controller.action();
    await controller.action();
    setBusy(true);
    await controller.action();
    expect(handle.install).not.toHaveBeenCalled();
    setBusy(false);
    await controller.action();
    expect(handle.install).toHaveBeenCalledTimes(1);
  });

  it("keeps the verified download for retry when installer launch fails", async () => {
    const { controller, handle } = fixture();
    handle.install.mockRejectedValueOnce(new Error("access denied"));
    await controller.action();
    await controller.action();
    await controller.action();
    expect(controller.getSnapshot()).toMatchObject({ status: "ready", canAct: true, installing: false });
    await controller.action();
    expect(handle.download).toHaveBeenCalledTimes(1);
    expect(handle.install).toHaveBeenCalledTimes(2);
  });

  it("does not install after a signature failure even after Finished", async () => {
    const { controller, handle } = fixture();
    handle.download.mockImplementationOnce(async (report) => {
      report({ event: "Finished" });
      throw new Error("signature mismatch");
    });
    await controller.action();
    await controller.action();
    expect(controller.getSnapshot()).toMatchObject({ status: "available", label: "Descargar" });
    await controller.action();
    expect(handle.download).toHaveBeenCalledTimes(2);
    expect(handle.install).not.toHaveBeenCalled();
  });

  it("handles an unknown download length without a false percentage", async () => {
    const { controller, handle } = fixture();
    handle.download.mockImplementation(async (report) => {
      report({ event: "Started", data: {} });
      report({ event: "Progress", data: { chunkLength: 200 } });
      expect(controller.getSnapshot().progress).toBeUndefined();
    });
    await controller.action();
    await controller.action();
  });

  it("distinguishes explicit 404, masked HTTP failure and network failure", async () => {
    const { controller, adapter } = fixture();
    adapter.check.mockRejectedValueOnce("HTTP status 404").mockRejectedValueOnce("Could not fetch a valid release JSON from the remote").mockRejectedValueOnce("connection timeout");
    await controller.action();
    expect(controller.getSnapshot()).toMatchObject({ status: "no-release", detail: "Todavía no hay una versión publicada." });
    await controller.action();
    expect(controller.getSnapshot().status).toBe("error");
    expect(controller.getSnapshot().detail).toContain("Puede que");
    await controller.action();
    expect(controller.getSnapshot().detail).toContain("conexión");
    expect(controller.getSnapshot().lastChecked).toBeTypeOf("number");
  });

  it("disposes a late check result after stop and tolerates StrictMode restart", async () => {
    const { controller, adapter, handle } = fixture();
    const pending = deferred<UpdateHandle | null>();
    adapter.check.mockReturnValueOnce(pending.promise);
    const action = controller.action();
    controller.stop();
    controller.start();
    await controller.action();
    expect(adapter.check).toHaveBeenCalledTimes(1);
    pending.resolve(handle);
    await action;
    expect(handle.close).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().status).toBe("idle");
    await controller.action();
    expect(adapter.check).toHaveBeenCalledTimes(2);
    controller.stop();
  });

  it("defers disposal until an in-flight download creates its byte resource", async () => {
    const { controller, handle } = fixture();
    const pending = deferred<void>();
    let report: ((event: DownloadEvent) => void) | undefined;
    handle.download.mockImplementation((callback) => { report = callback; return pending.promise; });
    await controller.action();
    const action = controller.action();
    controller.stop();
    expect(handle.close).not.toHaveBeenCalled();
    report?.({ event: "Finished" });
    pending.resolve(undefined);
    await action;
    expect(handle.close).toHaveBeenCalledTimes(1);
  });

  it("supports unsubscribe and releases an idle native update", async () => {
    const { controller, handle } = fixture();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    await controller.action();
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    controller.stop();
    expect(handle.close).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });
});
