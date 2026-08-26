import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import { modifyCharacterXp } from "./xp.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";

/** Every SQLSTATE this layer promises to say something specific about. */
const SQLSTATES = [
  ["23514", "invalid_value", "a figure that got past the rules layer"],
  ["23503", "not_found", "a character deleted mid-request"],
  ["42P01", "missing_table", "migrations not applied"],
  ["PGRST205", "missing_table", "absent from PostgREST's schema cache"],
  ["42703", "missing_column", "a migration written but never pushed"],
  ["42883", "missing_function", "the same, for the function"],
  ["PGRST202", "missing_function", "absent from PostgREST's schema cache"],
  ["22P02", "bad_id", "a junk id against a uuid column"],
];

describe("classify, through modifyCharacterXp", () => {
  for (const [code, reason, why] of SQLSTATES) {
    it(`maps ${code} to ${reason} (${why})`, async () => {
      const { data, error } = await modifyCharacterXp(
        stubQuery(postgrestError(code)),
        { campaignId: CAMPAIGN, characterIds: [CHARACTER], delta: 50 },
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }
});

describe("modifyCharacterXp", () => {
  it("sends the change, the chair and the table it happened at", async () => {
    const query = stubQuery({
      data: [{ id: CHARACTER, xp: 50, level: 1, levels_gained: 0 }],
      error: null,
    });

    await modifyCharacterXp(query, {
      campaignId: CAMPAIGN,
      characterIds: [CHARACTER],
      delta: 50,
      seatCharacterId: CHARACTER,
    });

    assert.equal(query.lastRpc.name, "modify_character_xp");
    assert.deepEqual(query.lastRpc.params, {
      p_char_ids: [CHARACTER],
      p_delta: 50,
      p_campaign: CAMPAIGN,
      p_seat: CHARACTER,
    });
  });

  it("carries every character an award reaches", async () => {
    const query = stubQuery({
      data: [{ id: CHARACTER, xp: 0, level: 2, levels_gained: 1 }],
      error: null,
    });

    await modifyCharacterXp(query, {
      campaignId: CAMPAIGN,
      characterIds: [CHARACTER, "other"],
      delta: 200,
    });

    assert.deepEqual(query.lastRpc.params.p_char_ids, [CHARACTER, "other"]);
    assert.equal(query.lastRpc.params.p_seat, null);
  });

  it("sends an empty list rather than a null the function cannot read", async () => {
    const query = stubQuery({ data: [], error: null });

    await modifyCharacterXp(query, { campaignId: CAMPAIGN, delta: 200 });

    assert.deepEqual(query.lastRpc.params.p_char_ids, []);
  });

  it("reads back where every character landed", async () => {
    const { data, error } = await modifyCharacterXp(
      stubQuery({
        data: [
          { id: CHARACTER, xp: 50, level: 2, levels_gained: 1 },
          { id: "other", xp: 10, level: 1, levels_gained: 0 },
        ],
        error: null,
      }),
      { campaignId: CAMPAIGN, characterIds: [CHARACTER, "other"], delta: 250 },
    );

    assert.equal(error, null);
    assert.deepEqual(data, [
      { id: CHARACTER, xp: 50, level: 2, levelsGained: 1 },
      { id: "other", xp: 10, level: 1, levelsGained: 0 },
    ]);
  });

  it("reads no rows as a refusal rather than a failure", async () => {
    const { data, error } = await modifyCharacterXp(
      stubQuery({ data: [], error: null }),
      { campaignId: CAMPAIGN, characterId: CHARACTER, delta: 50 },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});
