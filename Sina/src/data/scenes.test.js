import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  beginScenePainting,
  directSceneToken,
  hangScene,
  listSceneStaging,
  stageSceneCamera,
} from "./scenes.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const MAP = "6f1c3d2e-0000-4000-8000-00000000ma91";
const TOKEN = "6f1c3d2e-0000-4000-8000-0000000000t1";

const SQLSTATES = [
  ["23514", "invalid_value"],
  ["23503", "not_found"],
  ["42P01", "missing_table"],
  ["PGRST205", "missing_table"],
  ["42883", "missing_function"],
  ["PGRST202", "missing_function"],
  ["22P02", "bad_id"],
];

describe("classify, through stageSceneCamera", () => {
  for (const [code, reason] of SQLSTATES) {
    it(`maps ${code} to ${reason}`, async () => {
      const { error } = await stageSceneCamera(
        stubQuery(postgrestError(code)),
        {
          mapId: MAP,
          x: 0.5,
          y: 0.5,
          facing: 0,
        },
      );

      assert.equal(error.reason, reason);
    });
  }
});

describe("listSceneStaging", () => {
  it("asks for one campaign and never for a user_id", async () => {
    const chain = stubQuery({ data: [], error: null });

    const { data } = await listSceneStaging(chain, CAMPAIGN);

    assert.deepEqual(data, { cameras: [], directions: [] });
    assert.deepEqual(chain.filters, [
      ["campaign_id", CAMPAIGN],
      ["campaign_id", CAMPAIGN],
    ]);
    assert.doesNotMatch(chain.lastSelect, /user_id/);
  });
});

describe("stageSceneCamera", () => {
  it("passes the camera through, and reads false as a miss", async () => {
    const chain = stubQuery({ data: false, error: null });

    const { error } = await stageSceneCamera(chain, {
      mapId: MAP,
      x: 0.25,
      y: 0.75,
      facing: 90,
      note: "Dusk",
    });

    assert.deepEqual(chain.lastRpc, {
      name: "stage_scene_camera",
      params: {
        p_map_id: MAP,
        p_x: 0.25,
        p_y: 0.75,
        p_facing: 90,
        p_note: "Dusk",
      },
    });
    assert.equal(error.reason, "not_found");
  });
});

describe("directSceneToken", () => {
  it("sends an empty direction as one to remove", async () => {
    const chain = stubQuery({ data: true, error: null });

    await directSceneToken(chain, { tokenId: TOKEN, direction: null });

    assert.deepEqual(chain.lastRpc.params, {
      p_token_id: TOKEN,
      p_direction: "",
    });
  });
});

describe("beginScenePainting", () => {
  it("reads false as one already under way", async () => {
    const { error } = await beginScenePainting(
      stubQuery({ data: false, error: null }),
      { campaignId: CAMPAIGN },
    );

    assert.equal(error.reason, "scene_busy");
  });
});

describe("hangScene", () => {
  it("answers the scenes taken down", async () => {
    const { data } = await hangScene(
      stubQuery({ data: ["https://x/old.webp"], error: null }),
      {
        campaignId: CAMPAIGN,
        id: "s",
        name: "Crypt · scene",
        url: "https://x/new.webp",
      },
    );

    assert.deepEqual(data.evicted, ["https://x/old.webp"]);
  });

  it("tells a refusal from nothing taken down", async () => {
    const hung = await hangScene(stubQuery({ data: [], error: null }), {
      campaignId: CAMPAIGN,
      id: "s",
      name: "n",
      url: "u",
    });
    const refused = await hangScene(stubQuery({ data: null, error: null }), {
      campaignId: CAMPAIGN,
      id: "s",
      name: "n",
      url: "u",
    });

    assert.deepEqual(hung.data.evicted, []);
    assert.equal(refused.error.reason, "not_found");
  });
});
