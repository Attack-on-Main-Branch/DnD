import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker as Thread } from "node:worker_threads";
import { createContourWorker } from "./contour-worker-client.mjs";

test("terrain banners share one worker and transfer only their own contour buffers", async (t) => {
  const OriginalWorker = globalThis.Worker;
  const threads = [];
  let terminated = 0;
  globalThis.Worker = class {
    constructor(source) {
      this.thread = new Thread(
        `
          const { parentPort, workerData } = require("node:worker_threads");
          globalThis.self = {
            addEventListener: (_, handler) => parentPort.on("message", (data) => handler({ data })),
            postMessage: (data, transfer) => parentPort.postMessage(data, transfer),
          };
          import(workerData);
        `,
        { eval: true, workerData: source.href },
      );
      threads.push(this.thread);
    }
    addEventListener(name, handler) {
      this.thread.on(
        name,
        name === "message" ? (data) => handler({ data }) : handler,
      );
    }
    postMessage(data, transfer) {
      this.thread.postMessage(data, transfer);
    }
    terminate() {
      terminated++;
      this.thread.terminate();
    }
  };

  const first = createContourWorker();
  const second = createContourWorker();
  t.after(() => {
    first.dispose();
    second.dispose();
    if (OriginalWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = OriginalWorker;
  });

  const width = 16;
  const height = 16;
  const point = (7 * width + 7) * 4;
  const isolated = new Uint8Array(width * height * 4);
  isolated[point] = 255;
  const connected = isolated.slice();
  for (let x = 0; x < width; x++) connected[(7 * width + x) * 4] = 255;
  const speck = first.clean(isolated, width, height, 4);
  const line = second.clean(connected, width, height, 4);
  assert.equal(threads.length, 1);
  assert.equal(isolated.byteLength, 0);
  assert.equal(connected.byteLength, 0);
  assert.equal((await speck)[point], 0);
  const cleaned = await line;
  assert.equal(cleaned[point], 255);

  const canceled = assert.rejects(
    first.clean(cleaned, width, height, 4),
    /disposed/,
  );
  first.dispose();
  await canceled;
  assert.equal(terminated, 0);
  assert.equal((await second.clean(new Uint8Array(4), 1, 1, 4)).length, 4);
  second.dispose();
  assert.equal(terminated, 1);
});
