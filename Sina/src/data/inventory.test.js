import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  grantInventoryItem,
  insertCampaignItem,
  listCampaignItems,
  listCharacterInventory,
  listPartyInventory,
  moveInventoryItem,
  removeCampaignItem,
  spendInventoryItem,
  transferInventoryItem,
} from "./inventory.js";

const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";
const OTHER = "6f1c3d2e-0000-4000-8000-000000000001";
const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const CONTAINER = "6f1c3d2e-0000-4000-8000-00000000ba61";

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

  it("means the pack itself when no bag is named", async () => {
    // The stack is keyed on the three together since 20260831090000, so a
    // grant that named a bag by accident would land somewhere nobody looked.
    const query = stubQuery({ data: 1, error: null });
    await grantInventoryItem(query, {
      characterId: CHARACTER,
      item: ITEM,
      quantity: 1,
    });

    assert.equal(query.lastRpc.params.p_container, null);
  });

  it("carries the bag it lands in when there is one", async () => {
    const query = stubQuery({ data: 1, error: null });
    await grantInventoryItem(query, {
      characterId: CHARACTER,
      item: ITEM,
      quantity: 1,
      containerId: CONTAINER,
    });

    assert.equal(query.lastRpc.params.p_container, CONTAINER);
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

  it("reaches into the bag it was told to and no other", async () => {
    const query = stubQuery({ data: 1, error: null });
    await spendInventoryItem(query, {
      characterId: CHARACTER,
      slug: ITEM.slug,
      quantity: 1,
      containerId: CONTAINER,
    });

    assert.equal(query.lastRpc.params.p_container, CONTAINER);
  });
});

describe("moveInventoryItem", () => {
  it("names both pockets and never a second character", async () => {
    const query = stubQuery({ data: 3, error: null });
    const { data } = await moveInventoryItem(query, {
      characterId: CHARACTER,
      slug: ITEM.slug,
      quantity: 2,
      toContainerId: CONTAINER,
    });

    assert.equal(query.lastRpc.name, "move_inventory_item");
    assert.deepEqual(query.lastRpc.params, {
      target_character: CHARACTER,
      p_item_slug: ITEM.slug,
      p_quantity: 2,
      p_from_container: null,
      p_to_container: CONTAINER,
    });
    assert.deepEqual(data, { remaining: 3 });
  });

  it("reads the pack as a null container at either end", async () => {
    const query = stubQuery({ data: 0, error: null });
    const { data, error } = await moveInventoryItem(query, {
      characterId: CHARACTER,
      slug: ITEM.slug,
      quantity: 1,
      fromContainerId: CONTAINER,
    });

    assert.equal(query.lastRpc.params.p_from_container, CONTAINER);
    assert.equal(query.lastRpc.params.p_to_container, null);
    // Zero is a stack that moved whole, which is not a refusal.
    assert.equal(error, null);
    assert.deepEqual(data, { remaining: 0 });
  });

  it("reads null as a miss", async () => {
    const { data, error } = await moveInventoryItem(
      stubQuery({ data: null, error: null }),
      { characterId: CHARACTER, slug: ITEM.slug, quantity: 1 },
    );

    assert.equal(data, null);
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

  it("names the giver's bag and never the receiver's", async () => {
    // What is handed across a table arrives in the hand: `p_container` is the
    // stack it comes OUT of, and the function always deposits into the pack.
    const query = stubQuery({ data: true, error: null });
    await transferInventoryItem(query, {
      fromCharacterId: CHARACTER,
      toCharacterId: OTHER,
      item: ITEM,
      quantity: 1,
      containerId: CONTAINER,
    });

    assert.equal(query.lastRpc.params.p_container, CONTAINER);
    assert.ok(!("p_to_container" in query.lastRpc.params));
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

/**
 * Since 20260830090000 the entry describing a stack that moved is written by a
 * trigger on `character_inventory`, inside the same transaction. Three things
 * cannot be read off the row, so they have to reach the RPC: which table this
 * happened at, which chair did it, and which of the five deeds a quantity going
 * down was.
 */
describe("the table and the deed travel with the write", () => {
  it("names the deed on a spend, since the row change cannot", async () => {
    // Using, dropping and taking back are one row change and three sentences.
    const q = stubQuery({ data: 2, error: null });
    await spendInventoryItem(q, {
      characterId: CHARACTER,
      slug: ITEM.slug,
      quantity: 1,
      campaignId: CAMPAIGN,
      seatCharacterId: CHARACTER,
      deed: "item_used",
    });

    assert.equal(q.lastRpc.params.p_campaign, CAMPAIGN);
    assert.equal(q.lastRpc.params.p_seat, CHARACTER);
    assert.equal(q.lastRpc.params.p_deed, "item_used");
  });

  it("arms nothing when no deed is named, which is a grant to the whole party", async () => {
    // Six transactions and one sentence: that entry is written by its caller,
    // and a trigger firing per pack would put six of them in a log of ten.
    const q = stubQuery({ data: 4, error: null });
    await grantInventoryItem(q, {
      characterId: CHARACTER,
      item: ITEM,
      quantity: 3,
      campaignId: CAMPAIGN,
    });

    assert.equal(q.lastRpc.params.p_campaign, CAMPAIGN);
    assert.equal(q.lastRpc.params.p_deed, null);
  });

  it("sends the keys even when nothing was given for them", async () => {
    // PostgREST resolves an overload by the exact set of keys it is handed, so
    // an omitted parameter is a different function.
    const q = stubQuery({ data: 1, error: null });
    await grantInventoryItem(q, {
      characterId: CHARACTER,
      item: ITEM,
      quantity: 1,
    });

    for (const key of ["p_campaign", "p_seat", "p_deed"]) {
      assert.ok(key in q.lastRpc.params, `${key} was not sent`);
      assert.equal(q.lastRpc.params[key], null);
    }
  });

  it("files a hand-over under the giver, who is the sentence", async () => {
    const q = stubQuery({ data: true, error: null });
    await transferInventoryItem(q, {
      fromCharacterId: CHARACTER,
      toCharacterId: OTHER,
      item: ITEM,
      quantity: 2,
      campaignId: CAMPAIGN,
      seatCharacterId: CHARACTER,
    });

    assert.equal(q.lastRpc.params.p_campaign, CAMPAIGN);
    assert.equal(q.lastRpc.params.p_seat, CHARACTER);
    // No deed: a transfer is the only thing that function does.
    assert.equal(q.lastRpc.params.p_deed, undefined);
  });
});
