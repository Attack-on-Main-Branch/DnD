import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import { moveCharacterInspiration } from "./inspiration.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";

describe("classify, through moveCharacterInspiration", () => {
  for (const [code, reason] of [
    ["23514", "invalid_value"],
    ["23503", "not_found"],
    ["42P01", "missing_table"],
    ["PGRST205", "missing_table"],
    ["42703", "missing_column"],
    ["42883", "missing_function"],
    ["PGRST202", "missing_function"],
    ["22P02", "bad_id"],
  ]) {
    it(`maps ${code} to ${reason}`, async () => {
      const { data, error } = await moveCharacterInspiration(
        stubQuery(postgrestError(code)),
        { campaignId: CAMPAIGN, characterId: CHARACTER, delta: -1 },
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }
});

describe("moveCharacterInspiration", () => {
  it("sends the change and the table it happened at", async () => {
    const query = stubQuery({ data: 2, error: null });

    await moveCharacterInspiration(query, {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
      delta: -1,
    });

    assert.equal(query.lastRpc.name, "move_character_inspiration");
    assert.deepEqual(query.lastRpc.params, {
      p_char_id: CHARACTER,
      p_delta: -1,
      p_campaign: CAMPAIGN,
    });
  });

  it("reads back where the mark landed", async () => {
    const { data, error } = await moveCharacterInspiration(
      stubQuery({ data: 0, error: null }),
      { campaignId: CAMPAIGN, characterId: CHARACTER, delta: -1 },
    );

    assert.equal(error, null);
    assert.deepEqual(data, { inspiration: 0 });
  });

  it("reads no answer as a refusal rather than a failure", async () => {
    const { data, error } = await moveCharacterInspiration(
      stubQuery({ data: null, error: null }),
      { campaignId: CAMPAIGN, characterId: CHARACTER, delta: 1 },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});
