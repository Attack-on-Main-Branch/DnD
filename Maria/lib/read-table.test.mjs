import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const dataModule = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const slices = dataModule(
  await readFile(new URL("./table-slices.js", import.meta.url), "utf8"),
);
const source = await readFile(
  new URL("../app/dashboard/campaign/[id]/play/read-table.js", import.meta.url),
  "utf8",
);
const { gatherReads } = await import(
  dataModule(source.replace('"@/lib/table-slices"', JSON.stringify(slices)))
);

test("a timed-out table read releases the queue for the next refresh", async (t) => {
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, "timeout", (ms) => {
    assert.equal(ms, 15_000);
    return timeout(1);
  });

  let calls = 0;
  let queueNext;
  let queued;
  const landed = [];
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => {
    calls++;
    if (calls === 1) {
      queued = queueNext();
      await new Promise((resolve, reject) => {
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener("abort", () => reject(signal.reason));
      });
    }
    return { ok: true, json: async () => ({ activity: [] }) };
  });

  const read = gatherReads("campaign", (value) => landed.push(value));
  queueNext = () => read({ activity: true });

  // AbortSignal's timer is unref'd; keep this isolated test alive until it fires.
  const keepAlive = setTimeout(
    () => assert.fail("refresh did not finish"),
    1000,
  );
  t.after(() => clearTimeout(keepAlive));

  assert.equal(await read({ party: true }), false);
  assert.equal(await queued, true);
  assert.equal(calls, 2);
  assert.deepEqual(landed, [{ activity: [] }]);
});

test("simultaneous doorbells are read together", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ party: [], activity: [] }) };
  });

  const read = gatherReads("campaign", () => {});
  assert.deepEqual(
    await Promise.all([read({ party: true }), read({ activity: true })]),
    [true, true],
  );
  assert.equal(calls.length, 1);
  const query = new URL(calls[0], "https://example.test").searchParams;
  assert.deepEqual(
    new Set(query.get("want").split(",")),
    new Set(["party", "activity"]),
  );
});
