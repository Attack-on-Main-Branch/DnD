import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fogMaskObjectPath, fogMaskUrl, readFogSettings } from "./fog.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-00000000ca11";
const MAP = "6f1c3d2e-0000-4000-8000-00000000ma91";

const PUBLIC =
  "https://xyz.supabase.co/storage/v1/object/public/campaign-fog-masks/" +
  `campaigns/${CAMPAIGN}/maps/${MAP}/fog-mask.webp`;

describe("readFogSettings", () => {
  it("reads a row", () => {
    assert.deepEqual(
      readFogSettings({ fog_enabled: false, fog_mask_url: PUBLIC }),
      { enabled: false, maskUrl: PUBLIC },
    );
  });

  it("reads a message off the wire the same way", () => {
    assert.deepEqual(readFogSettings({ fogEnabled: true, maskUrl: PUBLIC }), {
      enabled: true,
      maskUrl: PUBLIC,
    });
  });

  it("is DARK for a row that has forgotten, and for no row at all", () => {
    assert.equal(readFogSettings({}).enabled, true);
    assert.equal(readFogSettings(null).enabled, true);
    assert.equal(readFogSettings(undefined).enabled, true);
  });

  it("holds no mask for anything that is not a URL", () => {
    assert.equal(readFogSettings({ fog_mask_url: "" }).maskUrl, null);
    assert.equal(readFogSettings({ fog_mask_url: 7 }).maskUrl, null);
  });
});

describe("fogMaskObjectPath", () => {
  it("puts the campaign in the second segment, where the policy reads it", () => {
    const path = fogMaskObjectPath({
      campaignId: CAMPAIGN,
      mapId: MAP,
      type: "image/webp",
    });

    assert.equal(path, `campaigns/${CAMPAIGN}/maps/${MAP}/fog-mask.webp`);
    assert.equal(path.split("/")[1], CAMPAIGN);
  });

  it("follows the blob's own type, a browser that cannot write WebP giving PNG", () => {
    assert.match(
      fogMaskObjectPath({
        campaignId: CAMPAIGN,
        mapId: MAP,
        type: "image/png",
      }),
      /fog-mask\.png$/,
    );
  });

  it("is the same path every time, so a repaint lands on itself", () => {
    const once = fogMaskObjectPath({
      campaignId: CAMPAIGN,
      mapId: MAP,
      type: "image/webp",
    });
    const again = fogMaskObjectPath({
      campaignId: CAMPAIGN,
      mapId: MAP,
      type: "image/webp",
    });

    assert.equal(once, again);
  });
});

describe("fogMaskUrl", () => {
  it("stamps the URL, so the same object is a different fetch", () => {
    assert.equal(
      fogMaskUrl(PUBLIC, 1700000000000),
      `${PUBLIC}?v=1700000000000`,
    );
  });

  it("has nothing to stamp for a map nobody has opened", () => {
    assert.equal(fogMaskUrl(null, 1), null);
  });
});
