import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { SPIDER_LILY_FRAME, SPIDER_LILY_WIND } from "./spider-lily-art.mjs";

const directory = new URL(
  "../app/dashboard/banner-art/spider-lilies/",
  import.meta.url,
);
const layout = JSON.parse(
  await readFile(new URL("layout.json", directory), "utf8"),
);

test("moving lily layers have transparent borders instead of clipped silhouettes", async () => {
  await Promise.all(
    SPIDER_LILY_WIND.map(async ({ name }) => {
      const { data, info } = await sharp(
        fileURLToPath(new URL(`${name}.webp`, directory)),
      )
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(info.width, layout[name].width, `${name} width`);
      assert.equal(info.height, layout[name].height, `${name} height`);
      const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];
      for (let x = 0; x < info.width; x++) {
        assert.ok(alpha(x, 0) <= 1, `${name} visible top edge at ${x}`);
        assert.ok(
          alpha(x, info.height - 1) <= 1,
          `${name} visible bottom edge at ${x}`,
        );
      }
      for (let y = 0; y < info.height; y++) {
        assert.ok(alpha(0, y) <= 1, `${name} visible left edge at ${y}`);
        assert.ok(
          alpha(info.width - 1, y) <= 1,
          `${name} visible right edge at ${y}`,
        );
      }
    }),
  );
});

test("edge flowers and the meadow retain artwork outside the banner", () => {
  assert.ok(layout.left.left < 0);
  for (const name of ["right", "edge", "meadow"]) {
    assert.ok(
      layout[name].left + layout[name].width > SPIDER_LILY_FRAME.width,
      name,
    );
  }
  assert.ok(layout.meadow.left < 0);
});
