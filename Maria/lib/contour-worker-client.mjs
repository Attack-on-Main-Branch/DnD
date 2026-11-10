let shared = null;
let sequence = 0;

function createService() {
  const worker = new Worker(new URL("./contour-worker.mjs", import.meta.url), {
    type: "module",
  });
  const service = { worker, clients: new Map(), failed: false };
  worker.addEventListener("message", ({ data: { id, pixels } }) => {
    const client = service.clients.get(id);
    if (!client) return;
    const { resolve } = client;
    client.resolve = client.reject = null;
    resolve?.(pixels);
  });
  function fail() {
    service.failed = true;
    worker.terminate();
    if (shared === service) shared = null;
    for (const client of service.clients.values()) {
      client.reject?.(new Error("Contour worker unavailable"));
      client.resolve = client.reject = null;
    }
  }
  worker.addEventListener("error", fail);
  worker.addEventListener("messageerror", fail);
  return service;
}

export function createContourWorker() {
  const service = (shared ??= createService());
  const id = ++sequence;
  const client = { resolve: null, reject: null };
  service.clients.set(id, client);
  let disposed = false;

  return {
    clean(pixels, width, height, minimumExtent) {
      if (disposed || service.failed || client.resolve)
        return Promise.reject(new Error("Contour worker unavailable"));
      return new Promise((resolve, reject) => {
        client.resolve = resolve;
        client.reject = reject;
        try {
          service.worker.postMessage(
            { id, pixels, width, height, minimumExtent },
            [pixels.buffer],
          );
        } catch (error) {
          client.resolve = client.reject = null;
          reject(error);
        }
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      client.reject?.(new Error("Contour worker disposed"));
      client.resolve = client.reject = null;
      service.clients.delete(id);
      if (service.clients.size === 0) {
        service.worker.terminate();
        if (shared === service) shared = null;
      } else if (!service.failed) {
        service.worker.postMessage({ id, dispose: true });
      }
    },
  };
}
