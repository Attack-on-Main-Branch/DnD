import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  grantInventoryItem,
  insertCampaignItem,
  listCampaignItems,
  listCharacterInventory,
  listPartyInventory,
  removeCampaignItem,
  spendInventoryItem,
  transferInventoryItem,
} from "./inventory.js";

const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";
const OTHER = "6f1c3d2e-0000-4000-8000-000000000001";
const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";

const ITEM = {
  slug: "potion-of-healing",
  name: "Potion of Healing",
  category: "Potion",
  description: "You regain hit points.",
  isCustom: false,
};

/** Every SQLSTATE this layer promises to say something specific about. */
const SQLSTATES = [
  ["23505", "already_carried", "two grants of one slug racing"],
  ["23514", "invalid_value", "a row that got past validateItem"],
  ["23503", "not_found", "a character deleted mid-request"],
  ["42P01", "missing_table", "migrations not applied"],
  ["42883", "missing_function", "a migration written but never pushed"],
  ["22P02", "bad_id", "a junk id against a uuid column"],
];

describe("classify, through listCharacterInventory", () => {
  for (const [code, reason, why] of SQLSTATES) {
    it(`maps ${code} to ${reason} (${why})`, async () => {
      const { data, error } = await listCharacterInventory(
        stubQuery(postgrestError(code)),
        CHARACTER,
      );
      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  it("falls back to unknown for a code it has no answer for", async () => {
    const { error } = await listCharacterInventory(
      stubQuery(postgrestError("42501")),
      CHARACTER,
    );
    assert.equal(error.reason, "unknown");
  });

  it("keeps the raw message as detail, for the log rather than the user", async () => {
    const { error } = await listCharacterInventory(
      stubQuery(
        postgrestError("42501", 'permission denied for "character_inventory"'),
      ),
      CHARACTER,
    );
    assert.equal(error.detail, 'permission denied for "character_inventory"');
  });
});

describe("listCharacterInventory", () => {
  it("asks for the columns the pack draws and no others", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCharacterInventory(query, CHARACTER);

    assert.match(query.lastSelect, /item_slug/);
    assert.match(query.lastSelect, /quantity/);
    // There is no `user_id` on this table, and nothing here may invent one.
    assert.ok(!query.lastSelect.includes("user_id"));
  });

  it("scopes to the one character", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCharacterInventory(query, CHARACTER);

    assert.deepEqual(query.filters, [["character_id", CHARACTER]]);
  });

  it("answers an empty pack with an empty list, not null", async () => {
    const { data, error } = await listCharacterInventory(
      stubQuery({ data: null, error: null }),
      CHARACTER,
    );
    assert.deepEqual(data, []);
    assert.equal(error, null);
  });
});

describe("listPartyInventory", () => {
  it("reads every named pack in one round trip", async () => {
    const query = stubQuery({ data: [], error: null });
    await listPartyInventory(query, [CHARACTER, OTHER]);

    assert.deepEqual(query.filters, [
      ["character_id", [CHARACTER, OTHER], "in"],
    ]);
  });

  it("never queries for an empty party", async () => {
    // PostgREST renders `in.()` as a syntax error, and a campaign with nobody
    // in it is the ordinary state of a new one.
    const query = stubQuery(postgrestError("42601"));
    const { data, error } = await listPartyInventory(query, []);

    assert.deepEqual(data, []);
    assert.equal(error, null);
    assert.deepEqual(query.filters, []);
  });
});

describe("grantInventoryItem", () => {
  it("calls the function that adds rather than sets", async () => {
    const query = stubQuery({ data: 4, error: null });
    const { data } = await grantInventoryItem(query, {
      characterId: CHARACTER,
      item: ITEM,
      quantity: 3,
    });

    assert.equal(query.lastRpc.name, "grant_inventory_item");
    assert.equal(query.lastRpc.params.target_character, CHARACTER);
    assert.equal(query.lastRpc.params.p_item_slug, ITEM.slug);
    assert.equal(query.lastRpc.params.p_quantity, 3);
    assert.equal(query.lastRpc.params.p_is_custom, false);
    // What the rulebook says about it rides with it — see 20260829090000.
    assert.deepEqual(query.lastRpc.params.p_facts, {});
    assert.equal(data.quantity, 4);
  });

  it("reads a refusal as a miss, the way the marks do", async () => {
    const { data, error } = await grantInventoryItem(
      stubQuery({ data: null, error: null }),
      { characterId: CHARACTER, item: ITEM, quantity: 1 },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });

  it("sends an empty description rather than null", async () => {
    const query = stubQuery({ data: 1, error: null });
    await grantInventoryItem(query, {
      characterId: CHARACTER,
      item: { ...ITEM, description: undefined },
      quantity: 1,
    });

    assert.equal(query.lastRpc.params.p_desc, "");
  });
});

describe("spendInventoryItem", () => {
  it("reports what is left, so a caller can word the confirmation", async () => {
    const query = stubQuery({ data: 2, error: null });
    const { data } = await spendInventoryItem(query, {
      characterId: CHARACTER,
      slug: ITEM.slug,
      quantity: 3,
    });

    assert.equal(query.lastRpc.name, "spend_inventory_item");
    assert.equal(data.remaining, 2);
  });

  it("keeps zero, which means the stack is gone and not that it failed", async () => {
    const { data, error } = await spendInventoryItem(
      stubQuery({ data: 0, error: null }),
      { characterId: CHARACTER, slug: ITEM.slug, quantity: 1 },
    );

    assert.equal(error, null);
    assert.equal(data.remaining, 0);
  });

  it("reads null as a miss", async () => {
    const { error } = await spendInventoryItem(
      stubQuery({ data: null, error: null }),
      { characterId: CHARACTER, slug: ITEM.slug, quantity: 1 },
    );

    assert.equal(error.reason, "not_found");
  });
});

describe("transferInventoryItem", () => {
  it("names both packs and the amount", async () => {
    const query = stubQuery({ data: true, error: null });
    const { data, error } = await transferInventoryItem(query, {
      fromCharacterId: CHARACTER,
      toCharacterId: OTHER,
      item: ITEM,
      quantity: 2,
    });

    assert.equal(query.lastRpc.name, "transfer_inventory_item");
    assert.equal(query.lastRpc.params.p_from_char_id, CHARACTER);
    assert.equal(query.lastRpc.params.p_to_char_id, OTHER);
    assert.equal(query.lastRpc.params.p_quantity, 2);
    assert.equal(error, null);
    assert.equal(data.quantity, 2);
  });

  it("reads false as a miss, so a refusal and a gap look alike", async () => {
    // Not enough of it, not at the same table, and not yours to move all come
    // back as `false`; none of the three may be distinguishable from outside.
    const { data, error } = await transferInventoryItem(
      stubQuery({ data: false, error: null }),
      {
        fromCharacterId: CHARACTER,
        toCharacterId: OTHER,
        item: ITEM,
        quantity: 2,
      },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });

  it("classifies a failed call rather than reporting it as a refusal", async () => {
    const { error } = await transferInventoryItem(
      stubQuery(postgrestError("42883")),
      {
        fromCharacterId: CHARACTER,
        toCharacterId: OTHER,
        item: ITEM,
        quantity: 1,
      },
    );

    assert.equal(error.reason, "missing_function");
  });
});

describe("the campaign's own catalogue", () => {
  const CUSTOM = {
    slug: "custom:rusted-key",
    name: "Rusted Key",
    category: "Quest Item",
    description: "Green with age.",
  };

  it("reads one campaign's items and no others", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCampaignItems(query, CAMPAIGN);

    assert.deepEqual(query.filters, [["campaign_id", CAMPAIGN]]);
    assert.match(query.lastSelect, /item_slug/);
    // The read already names the campaign, so echoing it back is dead weight.
    assert.ok(!query.lastSelect.includes("campaign_id"));
  });

  it("writes the derived slug rather than the name", async () => {
    const query = stubQuery({ data: { id: "row-1" }, error: null });
    await insertCampaignItem(query, { campaignId: CAMPAIGN, item: CUSTOM });

    assert.equal(query.lastInsert.item_slug, CUSTOM.slug);
    assert.equal(query.lastInsert.campaign_id, CAMPAIGN);
  });

  it("sends an empty description rather than null", async () => {
    const query = stubQuery({ data: { id: "row-1" }, error: null });
    await insertCampaignItem(query, {
      campaignId: CAMPAIGN,
      item: { ...CUSTOM, description: undefined },
    });

    assert.equal(query.lastInsert.description, "");
  });

  it("reads an RLS refusal on the insert as a miss", async () => {
    // A policy that matched nothing returns no row rather than failing.
    const { data, error } = await insertCampaignItem(
      stubQuery({ data: null, error: null }),
      { campaignId: CAMPAIGN, item: CUSTOM },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });

  it("names the ceiling the trigger raises", async () => {
    const { error } = await insertCampaignItem(
      stubQuery(postgrestError("P0001", "item_limit_reached")),
      { campaignId: CAMPAIGN, item: CUSTOM },
    );

    assert.equal(error.reason, "limit_reached");
  });

  it("tells a name already written down from a failure", async () => {
    const { error } = await insertCampaignItem(
      stubQuery(postgrestError("23505")),
      { campaignId: CAMPAIGN, item: CUSTOM },
    );

    assert.equal(error.reason, "already_carried");
  });

  it("scopes a strike to the campaign as well as the row", async () => {
    const query = stubQuery({ data: [{ id: "row-1" }], error: null });
    const { error } = await removeCampaignItem(query, {
      campaignId: CAMPAIGN,
      id: "row-1",
    });

    assert.equal(error, null);
    assert.deepEqual(query.filters, [
      ["id", "row-1"],
      ["campaign_id", CAMPAIGN],
    ]);
  });

  it("reads a strike that removed nothing as a miss", async () => {
    // A DELETE matching nothing is not an error and RLS filters silently, so
    // without the returned rows somebody else's id looks like a success.
    const { data, error } = await removeCampaignItem(
      stubQuery({ data: [], error: null }),
      { campaignId: CAMPAIGN, id: "row-1" },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});
