import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  announceDiceSkins,
  listDiceSkinUnlocks,
  openDicePouch,
} from "./dice-pouch.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";

describe("classify, through openDicePouch", () => {
  for (const [code, reason] of [
    ["42P01", "missing_table"],
    ["PGRST205", "missing_table"],
    ["42883", "missing_function"],
    ["PGRST202", "missing_function"],
    ["22P02", "bad_id"],
  ]) {
    it(`maps ${code} to ${reason}`, async () => {
      const { data, error } = await openDicePouch(
        stubQuery(postgrestError(code)),
        { campaignId: CAMPAIGN, characterId: CHARACTER },
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  it("knows a full collection by the function's own message", async () => {
    const { error } = await openDicePouch(
      stubQuery(postgrestError("P0001", "dice_pouch_empty")),
      { campaignId: CAMPAIGN, characterId: CHARACTER },
    );

    assert.equal(error.reason, "collection_complete");
  });
});

describe("openDicePouch", () => {
  it("names the table and the character, and nothing about the set", async () => {
    const query = stubQuery({ data: "galaxy", error: null });

    const { data } = await openDicePouch(query, {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
    });

    assert.equal(query.lastRpc.name, "open_dice_pouch");
    assert.deepEqual(query.lastRpc.params, {
      p_campaign: CAMPAIGN,
      p_character: CHARACTER,
    });
    assert.deepEqual(data, { skin: "galaxy" });
  });

  it("reads a refusal as not found", async () => {
    const { data, error } = await openDicePouch(
      stubQuery({ data: null, error: null }),
      { campaignId: CAMPAIGN, characterId: CHARACTER },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});

describe("announceDiceSkins", () => {
  it("reports how many lines were written", async () => {
    const query = stubQuery({ data: 2, error: null });

    const { data } = await announceDiceSkins(query, {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
    });

    assert.equal(query.lastRpc.name, "announce_dice_skins");
    assert.deepEqual(data, { announced: 2 });
  });
});

describe("listDiceSkinUnlocks", () => {
  it("asks nothing for nobody", async () => {
    const query = stubQuery(postgrestError("42P01"));

    assert.deepEqual(await listDiceSkinUnlocks(query, []), {
      data: [],
      error: null,
    });
    assert.equal(query.lastSelect, null);
  });

  it("reads the characters asked about, and no user_id", async () => {
    const query = stubQuery({ data: [{ skin: "wood" }], error: null });

    const { data } = await listDiceSkinUnlocks(query, [CHARACTER]);

    assert.deepEqual(data, [{ skin: "wood" }]);
    assert.deepEqual(query.filters, [["character_id", [CHARACTER], "in"]]);
    assert.equal(query.lastSelect.includes("user_id"), false);
  });
});
