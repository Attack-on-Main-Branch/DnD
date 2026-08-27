import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import { performLongRest, performShortRest } from "./rest.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";

const RESTED = {
  data: [{ id: CHARACTER, current_hp: 30, spell_slots: {}, hit_dice_spent: 1 }],
  error: null,
};

describe("classify, through performLongRest", () => {
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
      const { data, error } = await performLongRest(
        stubQuery(postgrestError(code)),
        { campaignId: CAMPAIGN, characterIds: [CHARACTER] },
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }
});

describe("the two rests", () => {
  it("asks for the one it is named after", async () => {
    const long = stubQuery(RESTED);
    const short = stubQuery(RESTED);

    await performLongRest(long, {
      campaignId: CAMPAIGN,
      characterIds: [CHARACTER],
    });
    await performShortRest(short, {
      campaignId: CAMPAIGN,
      characterIds: [CHARACTER],
    });

    assert.equal(long.lastRpc.name, "trigger_rest");
    assert.equal(long.lastRpc.params.p_rest_type, "long");
    assert.equal(short.lastRpc.params.p_rest_type, "short");
  });

  it("carries every character a rest reaches", async () => {
    const query = stubQuery(RESTED);

    await performLongRest(query, {
      campaignId: CAMPAIGN,
      characterIds: [CHARACTER, "other"],
    });

    assert.deepEqual(query.lastRpc.params, {
      p_campaign_id: CAMPAIGN,
      p_target_char_ids: [CHARACTER, "other"],
      p_rest_type: "long",
      p_seat: null,
    });
  });

  it("sends an empty list rather than a null the function cannot read", async () => {
    const query = stubQuery({ data: [], error: null });

    await performLongRest(query, { campaignId: CAMPAIGN });

    assert.deepEqual(query.lastRpc.params.p_target_char_ids, []);
  });

  it("reads back the numbers everybody woke on", async () => {
    const { data, error } = await performLongRest(stubQuery(RESTED), {
      campaignId: CAMPAIGN,
      characterIds: [CHARACTER],
      seatCharacterId: CHARACTER,
    });

    assert.equal(error, null);
    assert.deepEqual(data, [
      { id: CHARACTER, currentHp: 30, spellSlots: {}, hitDiceSpent: 1 },
    ]);
  });

  it("reads no rows as a refusal rather than a failure", async () => {
    const { data, error } = await performShortRest(
      stubQuery({ data: [], error: null }),
      { campaignId: CAMPAIGN, characterIds: [CHARACTER] },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});
