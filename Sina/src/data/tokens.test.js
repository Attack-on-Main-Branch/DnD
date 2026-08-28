import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  clearMapPlacedTokens,
  insertTokenTemplate,
  listCampaignTokenTemplates,
  listMapPlacedTokens,
  moveMapToken,
  placeMapToken,
  removeMapToken,
  removeTokenTemplate,
  setMapTokenState,
} from "./tokens.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const MAP = "6f1c3d2e-0000-4000-8000-00000000ma91";
const OTHER_MAP = "6f1c3d2e-0000-4000-8000-00000000ma92";
const TEMPLATE = "6f1c3d2e-0000-4000-8000-0000000007e3";
const TOKEN = "6f1c3d2e-0000-4000-8000-0000000000t1";
const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000ch4";

/** Every SQLSTATE this layer promises to say something specific about. */
const SQLSTATES = [
  ["23514", "invalid_value", "a row that got past validateTokenTemplate"],
  ["23505", "already_placed", "two placements racing for one seat's square"],
  ["23503", "not_found", "a map deleted mid-request"],
  ["42P01", "missing_table", "migrations not applied"],
  ["PGRST205", "missing_table", "PostgREST has no entry for the table"],
  ["42703", "missing_column", "a migration written but never pushed"],
  ["42883", "missing_function", "the definer functions are not there"],
  ["PGRST202", "missing_function", "PostgREST has no entry for the function"],
  ["22P02", "bad_id", "a junk id against a uuid column"],
];

describe("classify, through listCampaignTokenTemplates", () => {
  for (const [code, reason, why] of SQLSTATES) {
    it(`maps ${code} to ${reason} (${why})`, async () => {
      const { data, error } = await listCampaignTokenTemplates(
        stubQuery(postgrestError(code)),
        CAMPAIGN,
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  it("reads the trigger's own message, which has no SQLSTATE", async () => {
    const { error } = await listCampaignTokenTemplates(
      stubQuery(postgrestError("P0001", "token_limit_reached")),
      CAMPAIGN,
    );

    assert.equal(error.reason, "limit_reached");
  });
});

describe("the hand", () => {
  it("asks for one campaign's pieces and never for a user_id", async () => {
    const chain = stubQuery({ data: [], error: null });

    await listCampaignTokenTemplates(chain, CAMPAIGN);

    assert.deepEqual(chain.filters, [["campaign_id", CAMPAIGN]]);
    assert.doesNotMatch(chain.lastSelect, /user_id/);
  });

  it("hands back an empty list rather than null when nothing is invented", async () => {
    const { data } = await listCampaignTokenTemplates(
      stubQuery({ data: null, error: null }),
      CAMPAIGN,
    );

    assert.deepEqual(data, []);
  });

  it("writes the id the caller made, the picture having been named after it", async () => {
    const made = { id: TEMPLATE, campaign_id: CAMPAIGN, name: "Goblin" };
    const chain = stubQuery({ data: [made], error: null });

    const { data } = await insertTokenTemplate(chain, {
      id: TEMPLATE,
      campaignId: CAMPAIGN,
      name: "Goblin",
      imageUrl: "https://x/goblin.webp",
    });

    assert.deepEqual(chain.lastInsert, {
      id: TEMPLATE,
      campaign_id: CAMPAIGN,
      name: "Goblin",
      image_url: "https://x/goblin.webp",
    });
    assert.deepEqual(data, made);
  });

  it("reads an insert that wrote no row as a miss", async () => {
    const { data, error } = await insertTokenTemplate(
      stubQuery({ data: [], error: null }),
      { id: TEMPLATE, campaignId: CAMPAIGN, name: "Goblin", imageUrl: "u" },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });

  it("reports the picture it removed, the last thing pointing at the object", async () => {
    const chain = stubQuery({
      data: [{ image_url: "https://x/goblin.webp" }],
      error: null,
    });

    const { data } = await removeTokenTemplate(chain, {
      id: TEMPLATE,
      campaignId: CAMPAIGN,
    });

    assert.deepEqual(data, { imageUrl: "https://x/goblin.webp" });
    // The policy already answers this; the filter is the second lock.
    assert.deepEqual(chain.filters, [
      ["id", TEMPLATE],
      ["campaign_id", CAMPAIGN],
    ]);
  });

  it("reads a delete that removed nothing as a miss", async () => {
    const { data, error } = await removeTokenTemplate(
      stubQuery({ data: [], error: null }),
      { id: TEMPLATE, campaignId: CAMPAIGN },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});

describe("the board", () => {
  it("reads every map's pieces in one query", async () => {
    const chain = stubQuery({ data: [], error: null });

    await listMapPlacedTokens(chain, [MAP, OTHER_MAP]);

    assert.deepEqual(chain.filters, [["map_id", [MAP, OTHER_MAP], "in"]]);
  });

  it("asks nothing at all when there are no maps", async () => {
    const chain = stubQuery(postgrestError("42P01"));
    const { data, error } = await listMapPlacedTokens(chain, []);

    assert.deepEqual(data, []);
    assert.equal(error, null);
    assert.equal(chain.lastSelect, null);
  });

  it("never selects a column the board does not draw", async () => {
    const chain = stubQuery({ data: [], error: null });

    await listMapPlacedTokens(chain, [MAP]);

    assert.doesNotMatch(chain.lastSelect, /user_id/);
    assert.match(chain.lastSelect, /is_hidden/);
  });

  it("places through the definer function and hands back the new row's id", async () => {
    const chain = stubQuery({ data: TOKEN, error: null });

    const { data } = await placeMapToken(chain, {
      mapId: MAP,
      templateId: TEMPLATE,
      x: 0.25,
      y: 0.5,
      q: 2,
      r: -3,
      ringColor: "#3b82f6",
    });

    assert.equal(chain.lastRpc.name, "place_map_token");
    assert.deepEqual(chain.lastRpc.params, {
      p_map_id: MAP,
      p_character_id: null,
      p_template_id: TEMPLATE,
      p_party: false,
      p_x: 0.25,
      p_y: 0.5,
      p_q: 2,
      p_r: -3,
      p_ring_color: "#3b82f6",
    });
    assert.deepEqual(data, { id: TOKEN });
  });

  it("sends no cell for a board with no grid to have one on", async () => {
    const chain = stubQuery({ data: TOKEN, error: null });

    await placeMapToken(chain, {
      mapId: MAP,
      characterId: CHARACTER,
      x: 0.1,
      y: 0.1,
      q: undefined,
      r: null,
    });

    assert.equal(chain.lastRpc.params.p_q, null);
    assert.equal(chain.lastRpc.params.p_r, null);
  });

  it("reads a refusal as a miss — the two are deliberately one answer", async () => {
    const { data, error } = await placeMapToken(
      stubQuery({ data: null, error: null }),
      { mapId: MAP, isPartyMarker: true, x: 0.1, y: 0.1 },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });

  it("moves by id, the function asking again whose hand this is", async () => {
    const chain = stubQuery({ data: true, error: null });

    await moveMapToken(chain, { tokenId: TOKEN, x: 0.4, y: 0.6, q: 1, r: 1 });

    assert.equal(chain.lastRpc.name, "move_map_token");
    assert.equal(chain.lastRpc.params.p_token_id, TOKEN);
  });

  it("writes hidden, dead and the conditions together", async () => {
    const chain = stubQuery({ data: true, error: null });

    await setMapTokenState(chain, {
      tokenId: TOKEN,
      isDead: true,
      conditions: ["poisoned"],
    });

    assert.equal(chain.lastRpc.name, "set_map_token_state");
    assert.deepEqual(chain.lastRpc.params, {
      p_token_id: TOKEN,
      // Absent leaves the column where it stands.
      p_hidden: null,
      p_dead: true,
      p_conditions: ["poisoned"],
    });
  });

  it("takes one off by id", async () => {
    const chain = stubQuery({ data: true, error: null });

    const { data } = await removeMapToken(chain, { tokenId: TOKEN });

    assert.equal(chain.lastRpc.name, "remove_map_token");
    assert.equal(data, true);
  });

  it("sweeps a map clear, which is what ruling a free-form board does", async () => {
    const chain = stubQuery({ data: true, error: null });

    await clearMapPlacedTokens(chain, { mapId: MAP });

    assert.equal(chain.lastRpc.name, "clear_map_placed_tokens");
    assert.deepEqual(chain.lastRpc.params, { p_map_id: MAP });
  });
});
