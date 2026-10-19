import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { setPlayerDicePaused } from "./campaigns.js";
import { stubQuery } from "../supabase-stub.js";

describe("player dice permissions", () => {
  for (const paused of [true, false]) {
    it(`${paused ? "pauses" : "resumes"} through the DM-only function`, async () => {
      const query = stubQuery({ data: true, error: null });
      assert.deepEqual(
        await setPlayerDicePaused(query, { id: "campaign", paused }),
        {
          data: true,
          error: null,
        },
      );
      assert.deepEqual(query.lastRpc, {
        name: "set_player_dice_paused",
        params: { target_campaign: "campaign", paused },
      });
    });
  }

  it("reports an unauthorized or missing campaign as a refusal", async () => {
    const query = stubQuery({ data: false, error: null });
    const result = await setPlayerDicePaused(query, {
      id: "campaign",
      paused: true,
    });
    assert.equal(result.data, null);
    assert.equal(result.error.reason, "not_found");
  });

  it("classifies an unapplied migration", async () => {
    const query = stubQuery({
      data: null,
      error: { code: "PGRST202", message: "detail" },
    });
    const result = await setPlayerDicePaused(query, {
      id: "campaign",
      paused: true,
    });
    assert.equal(result.error.reason, "missing_function");
  });
});
