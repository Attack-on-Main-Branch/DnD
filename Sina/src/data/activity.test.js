import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_ACTIVITY_ENTRIES } from "../rules/activity.js";
import { postgrestError, stubQuery } from "../supabase-stub.js";
import { listCampaignActivity, recordCampaignActivity } from "./activity.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";
const OTHER = "6f1c3d2e-0000-4000-8000-000000000001";

/** Every SQLSTATE this layer promises to say something specific about. */
const SQLSTATES = [
  ["23514", "invalid_value", "a row that got past the rules layer"],
  ["23503", "not_found", "a campaign deleted mid-request"],
  ["42P01", "missing_table", "migrations not applied"],
  [
    "PGRST205",
    "missing_table",
    "the table absent from PostgREST's schema cache",
  ],
  ["42883", "missing_function", "a migration written but never pushed"],
  [
    "PGRST202",
    "missing_function",
    "the function absent from PostgREST's schema cache",
  ],
  ["22P02", "bad_id", "a junk id against a uuid column"],
];

describe("classify, through listCampaignActivity", () => {
  for (const [code, reason, why] of SQLSTATES) {
    it(`maps ${code} to ${reason} (${why})`, async () => {
      const { data, error } = await listCampaignActivity(
        stubQuery(postgrestError(code)),
        CAMPAIGN,
        MAX_ACTIVITY_ENTRIES,
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  it("falls back to unknown for a code it has no answer for", async () => {
    const { error } = await listCampaignActivity(
      stubQuery(postgrestError("42501")),
      CAMPAIGN,
      MAX_ACTIVITY_ENTRIES,
    );

    assert.equal(error.reason, "unknown");
  });
});

describe("listCampaignActivity", () => {
  it("asks for the columns the panel draws and no others", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCampaignActivity(query, CAMPAIGN, MAX_ACTIVITY_ENTRIES);

    assert.match(query.lastSelect, /action_type/);
    assert.match(query.lastSelect, /payload/);
    // There is no `user_id` on this table, and nothing here may invent one.
    assert.ok(!query.lastSelect.includes("user_id"));
  });

  it("scopes to the one campaign and stops at the ceiling", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCampaignActivity(query, CAMPAIGN, MAX_ACTIVITY_ENTRIES);

    assert.deepEqual(query.filters, [["campaign_id", CAMPAIGN]]);
    assert.equal(query.lastLimit, MAX_ACTIVITY_ENTRIES);
  });

  it("answers an empty log with an empty list, not null", async () => {
    const { data, error } = await listCampaignActivity(
      stubQuery({ data: null, error: null }),
      CAMPAIGN,
      MAX_ACTIVITY_ENTRIES,
    );

    assert.deepEqual(data, []);
    assert.equal(error, null);
  });
});

describe("recordCampaignActivity", () => {
  it("sends every argument the function takes, nulls included", async () => {
    // PostgREST resolves an overload by the exact set of keys it is given, and
    // the function has no defaults — a call short of one key finds no function.
    const query = stubQuery({ data: true, error: null });

    await recordCampaignActivity(query, {
      campaignId: CAMPAIGN,
      actorCharacterId: CHARACTER,
      action: "dice_roll",
      die: "d20",
      diceCount: 1,
      value: 18,
    });

    assert.equal(query.lastRpc.name, "record_campaign_activity");
    assert.deepEqual(query.lastRpc.params, {
      target_campaign: CAMPAIGN,
      actor_character: CHARACTER,
      action: "dice_roll",
      target_character: null,
      item_name: null,
      item_quantity: null,
      die_type: "d20",
      dice_count: 1,
      roll_value: 18,
      hp_delta: null,
      level_value: null,
      level_delta: null,
      coin_type: null,
      coin_amount: null,
      spell_name: null,
      spell_level: null,
      spell_damage: null,
      spell_save: null,
    });
  });

  it("carries both ends of a level change", async () => {
    // Where the ring landed and which way it got there. Neither is derivable
    // from the other, and 20260823120000 will not re-read the row for it.
    const query = stubQuery({ data: true, error: null });

    await recordCampaignActivity(query, {
      campaignId: CAMPAIGN,
      action: "level_change",
      targetCharacterId: OTHER,
      level: 5,
      levelDelta: 1,
    });

    assert.equal(query.lastRpc.params.level_value, 5);
    assert.equal(query.lastRpc.params.level_delta, 1);
    assert.equal(query.lastRpc.params.target_character, OTHER);
    // The head of the table's alone, so never filed under a chair.
    assert.equal(query.lastRpc.params.actor_character, null);
  });

  it("sends the head of the table as no character at all", async () => {
    const query = stubQuery({ data: true, error: null });

    await recordCampaignActivity(query, {
      campaignId: CAMPAIGN,
      action: "secret_dice_roll",
      die: "d20",
    });

    assert.equal(query.lastRpc.params.actor_character, null);
    assert.equal(query.lastRpc.params.roll_value, null);
  });

  it("carries a transfer's other end", async () => {
    const query = stubQuery({ data: true, error: null });

    await recordCampaignActivity(query, {
      campaignId: CAMPAIGN,
      actorCharacterId: CHARACTER,
      action: "item_transferred",
      targetCharacterId: OTHER,
      itemName: "Potion of Healing",
      quantity: 2,
    });

    assert.equal(query.lastRpc.params.target_character, OTHER);
    assert.equal(query.lastRpc.params.item_quantity, 2);
  });

  it("reads a refusal as not_found, the way a deleted campaign reads", async () => {
    const { data, error } = await recordCampaignActivity(
      stubQuery({ data: false, error: null }),
      { campaignId: CAMPAIGN, action: "dice_roll", die: "d20", value: 1 },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });

  it("reports a write that landed", async () => {
    const { data, error } = await recordCampaignActivity(
      stubQuery({ data: true, error: null }),
      { campaignId: CAMPAIGN, action: "dice_roll", die: "d20", value: 1 },
    );

    assert.equal(data, true);
    assert.equal(error, null);
  });
});
