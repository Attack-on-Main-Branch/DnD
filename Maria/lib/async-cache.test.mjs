import assert from "node:assert/strict";
import { test } from "node:test";

import { memoizeAsync } from "./async-cache.mjs";

test("overlapping searches share pending and fulfilled details by slug", async () => {
  let calls = 0;
  let finish;
  const detail = memoizeAsync(
    () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    (entry) => entry.slug,
  );

  const first = detail({ slug: "longsword" });
  const second = detail({ slug: "longsword" });
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);

  finish({ name: "Longsword" });
  assert.deepEqual(await first, { name: "Longsword" });
  assert.equal(detail({ slug: "longsword" }), first);
  assert.equal(calls, 1);
});

test("a failed detail can be retried without disturbing another key", async () => {
  let calls = 0;
  const detail = memoizeAsync(
    async (slug) => {
      if (slug === "longsword" && calls++ === 0) {
        throw new Error("upstream unavailable");
      }
      return slug;
    },
    (slug) => slug,
  );

  const other = detail("shield");
  await assert.rejects(detail("longsword"), /upstream unavailable/);
  assert.equal(await detail("longsword"), "longsword");
  assert.equal(detail("shield"), other);
  assert.equal(calls, 2);
});
