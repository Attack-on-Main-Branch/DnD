import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  announceSkins,
  listDiceSkinUnlocks,
  listBannerSkinUnlocks,
  openSkinPouch,
} from "./dice-pouch.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";

describe("classify, through openSkinPouch", () => {
  for (const [code, reason] of [
    ["42P01", "missing_table"],
    ["PGRST205", "missing_table"],
    ["42883", "missing_function"],
    ["PGRST202", "missing_function"],
    ["22P02", "bad_id"],
  ]) {
    it(`maps ${code} to ${reason}`, async () => {
      const { data, error } = await openSkinPouch(
        stubQuery(postgrestError(code)),
        { campaignId: CAMPAIGN, characterId: CHARACTER },
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  it("knows a full collection by the function's own message", async () => {
    const { error } = await openSkinPouch(
      stubQuery(postgrestError("P0001", "dice_pouch_empty")),
      { campaignId: CAMPAIGN, characterId: CHARACTER },
    );

    assert.equal(error.reason, "collection_complete");
  });
});

describe("openSkinPouch", () => {
  it("names the table and the character, and nothing about the set", async () => {
    const query = stubQuery({
      data: { kind: "dice", skin: "galaxy" },
      error: null,
    });

    const { data } = await openSkinPouch(query, {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
    });

    assert.equal(query.lastRpc.name, "open_pouch");
    assert.deepEqual(query.lastRpc.params, {
      p_campaign: CAMPAIGN,
      p_character: CHARACTER,
    });
    assert.deepEqual(data, { kind: "dice", skin: "galaxy" });
  });

  it("reads a refusal as not found", async () => {
    const { data, error } = await openSkinPouch(
      stubQuery({ data: null, error: null }),
      { campaignId: CAMPAIGN, characterId: CHARACTER },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});

describe("announceSkins", () => {
  it("reports how many lines were written", async () => {
    const query = stubQuery({ data: 2, error: null });

    const { data } = await announceSkins(query, {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
    });

    assert.equal(query.lastRpc.name, "announce_skins");
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

describe("banner unlocks", () => {
  it("reads the banner collection separately from dice", async () => {
    const query = stubQuery({ data: [{ skin: "dragon-lore" }], error: null });
    let table;
    query.from = (name) => {
      table = name;
      return query;
    };
    const result = await listBannerSkinUnlocks(query, [CHARACTER]);
    assert.equal(table, "character_banner_skins");
    assert.deepEqual(result.data, [{ skin: "dragon-lore" }]);
    assert.equal(query.lastSelect.includes("user_id"), false);
  });

  it("returns a typed banner reward from the same pouch", async () => {
    const reward = { kind: "banner", skin: "dragon-lore" };
    const result = await openSkinPouch(
      stubQuery({ data: reward, error: null }),
      { campaignId: CAMPAIGN, characterId: CHARACTER },
    );
    assert.deepEqual(result, { data: reward, error: null });
  });
});
