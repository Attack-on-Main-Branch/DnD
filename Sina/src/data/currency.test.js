import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  listPartyPurses,
  moveCampaignCurrency,
  spendCurrency,
  transferCurrency,
} from "./currency.js";

const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";
const OTHER = "6f1c3d2e-0000-4000-8000-000000000001";
const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";

/** Every code this layer promises to say something specific about. */
const CODES = [
  ["23514", "invalid_value", "a row that got past parseCoins"],
  ["22003", "invalid_value", "an amount that overflowed int4"],
  ["23503", "not_found", "a character deleted mid-request"],
  ["42P01", "missing_table", "migrations not applied"],
  ["PGRST205", "missing_table", "a table PostgREST has no entry for"],
  ["42883", "missing_function", "a migration written but never pushed"],
  ["PGRST202", "missing_function", "a function PostgREST has no entry for"],
  ["22P02", "bad_id", "a junk id against a uuid column"],
];

describe("classify, through listPartyPurses", () => {
  for (const [code, reason, why] of CODES) {
    it(`maps ${code} to ${reason} (${why})`, async () => {
      const { data, error } = await listPartyPurses(
        stubQuery(postgrestError(code)),
        CAMPAIGN,
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  it("falls back to unknown for a code it has no answer for", async () => {
    const { error } = await listPartyPurses(
      stubQuery(postgrestError("42501")),
      CAMPAIGN,
    );

    assert.equal(error.reason, "unknown");
  });

  it("keeps the raw message as detail, for the log rather than the user", async () => {
    const { error } = await listPartyPurses(
      stubQuery(postgrestError("42501", 'permission denied for "characters"')),
      CAMPAIGN,
    );

    assert.equal(error.detail, 'permission denied for "characters"');
  });
});

describe("listPartyPurses", () => {
  it("goes through the definer function rather than the table", async () => {
    // RLS grants rows and never columns: a policy wide enough to let a Dungeon
    // Master read a player's coins hands over their backstory with it.
    const query = stubQuery({ data: [], error: null });
    await listPartyPurses(query, CAMPAIGN);

    assert.equal(query.lastRpc.name, "campaign_purses");
    assert.deepEqual(query.lastRpc.params, { target_campaign: CAMPAIGN });
    assert.equal(query.lastSelect, null);
  });

  it("answers an empty party with an empty list, not null", async () => {
    const { data, error } = await listPartyPurses(
      stubQuery({ data: null, error: null }),
      CAMPAIGN,
    );

    assert.deepEqual(data, []);
    assert.equal(error, null);
  });
});

describe("moveCampaignCurrency", () => {
  it("names one character, five denominations and the direction", async () => {
    const query = stubQuery({
      data: [{ character_id: CHARACTER, gp: 20 }],
      error: null,
    });

    const { data } = await moveCampaignCurrency(query, {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
      coins: { cp: 0, sp: 0, ep: 0, gp: 20, pp: 0 },
    });

    assert.equal(query.lastRpc.name, "move_campaign_currency");
    assert.deepEqual(query.lastRpc.params, {
      p_campaign_id: CAMPAIGN,
      p_character: CHARACTER,
      p_cp: 0,
      p_sp: 0,
      p_ep: 0,
      p_gp: 20,
      p_pp: 0,
      p_take: false,
    });
    // What moved, per purse, and never what was asked for.
    assert.deepEqual(data.moved, [{ character_id: CHARACTER, gp: 20 }]);
  });

  it("sends a null character for the whole party", async () => {
    const query = stubQuery({ data: [], error: null });

    await moveCampaignCurrency(query, {
      campaignId: CAMPAIGN,
      coins: { cp: 0, sp: 40, ep: 0, gp: 0, pp: 0 },
      take: true,
    });

    assert.equal(query.lastRpc.params.p_character, null);
    assert.equal(query.lastRpc.params.p_take, true);
  });

  it("answers nothing moved with an empty list, not null", async () => {
    // A refusal and an empty party are the same answer from here: the
    // permission is settled inside the function, and refusing looks exactly
    // like finding nobody.
    const { data, error } = await moveCampaignCurrency(
      stubQuery({ data: null, error: null }),
      { campaignId: CAMPAIGN, coins: { cp: 0, sp: 0, ep: 0, gp: 1, pp: 0 } },
    );

    assert.deepEqual(data.moved, []);
    assert.equal(error, null);
  });
});

describe("spendCurrency", () => {
  it("asks the three-argument function, with no campaign to scope it", async () => {
    // Spending is the owner's and their Dungeon Master's alike, which
    // `spend_currency` answers from the character alone.
    const query = stubQuery({ data: 4, error: null });

    const { data } = await spendCurrency(query, {
      characterId: CHARACTER,
      coin: "sp",
      amount: 4,
    });

    assert.equal(query.lastRpc.name, "spend_currency");
    assert.deepEqual(query.lastRpc.params, {
      p_char_id: CHARACTER,
      p_currency_type: "sp",
      p_amount: 4,
    });
    // What LEFT the purse, which is what the log is written from.
    assert.deepEqual(data, { taken: 4 });
  });

  it("reports the difference when the purse was short", async () => {
    // Clamped rather than refused: a stale page asking for more than is there
    // empties it, and says so.
    const { data } = await spendCurrency(stubQuery({ data: 3, error: null }), {
      characterId: CHARACTER,
      coin: "gp",
      amount: 9999,
    });

    assert.deepEqual(data, { taken: 3 });
  });

  it("keeps zero a real answer — the purse was already empty", async () => {
    const { data, error } = await spendCurrency(
      stubQuery({ data: 0, error: null }),
      { characterId: CHARACTER, coin: "sp", amount: 4 },
    );

    assert.deepEqual(data, { taken: 0 });
    assert.equal(error, null);
  });

  it("reads null as not_found, so refused and gone are indistinguishable", async () => {
    const { error } = await spendCurrency(
      stubQuery({ data: null, error: null }),
      { characterId: CHARACTER, coin: "sp", amount: 4 },
    );

    assert.equal(error.reason, "not_found");
  });
});

describe("transferCurrency", () => {
  it("sends both ends and the denomination", async () => {
    const query = stubQuery({ data: true, error: null });

    const { data } = await transferCurrency(query, {
      fromCharacterId: CHARACTER,
      toCharacterId: OTHER,
      coin: "pp",
      amount: 2,
    });

    assert.equal(query.lastRpc.name, "transfer_currency");
    assert.deepEqual(query.lastRpc.params, {
      p_from_char_id: CHARACTER,
      p_to_char_id: OTHER,
      p_currency_type: "pp",
      p_amount: 2,
    });
    assert.deepEqual(data, { amount: 2 });
  });

  it("reads false as not_found: not enough, not here, not yours", async () => {
    const { data, error } = await transferCurrency(
      stubQuery({ data: false, error: null }),
      {
        fromCharacterId: CHARACTER,
        toCharacterId: OTHER,
        coin: "pp",
        amount: 2,
      },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});
