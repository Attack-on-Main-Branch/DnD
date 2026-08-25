import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  hideChest,
  insertContainer,
  listCampaignContainers,
  listContainerItems,
  removeContainer,
  revealChest,
  stockContainerItem,
  takeChestItem,
  transferContainer,
} from "./containers.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const CONTAINER = "6f1c3d2e-0000-4000-8000-00000000c4e5";
const OTHER = "6f1c3d2e-0000-4000-8000-00000000ba61";
const FRIEREN = "6f1c3d2e-0000-4000-8000-000000000000";
const FERN = "6f1c3d2e-0000-4000-8000-000000000001";
const ROW_ID = "6f1c3d2e-0000-4000-8000-0000000017e3";

const ITEM = {
  slug: "potion-of-healing",
  name: "Potion of Healing",
  category: "Potion",
  description: "You regain hit points.",
  isCustom: false,
  facts: { cost: "50 gp" },
};

/** Every SQLSTATE this layer promises to say something specific about. */
const SQLSTATES = [
  ["23505", "already_carried", "two stockings of one slug racing"],
  ["23514", "invalid_value", "a row that got past validateContainer"],
  ["23503", "not_found", "a campaign deleted mid-request"],
  ["42P01", "missing_table", "migrations not applied"],
  ["PGRST205", "missing_table", "PostgREST has no entry for the table"],
  ["42883", "missing_function", "a migration written but never pushed"],
  ["PGRST202", "missing_function", "PostgREST has no entry for the function"],
  ["22P02", "bad_id", "a junk id against a uuid column"],
];

describe("classify, through listCampaignContainers", () => {
  for (const [code, reason, why] of SQLSTATES) {
    it(`maps ${code} to ${reason} (${why})`, async () => {
      const { data, error } = await listCampaignContainers(
        stubQuery(postgrestError(code)),
        CAMPAIGN,
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  it("reads the trigger's own message, which has no SQLSTATE", async () => {
    const { error } = await listCampaignContainers(
      stubQuery(postgrestError("P0001", "container_limit_reached")),
      CAMPAIGN,
    );

    assert.equal(error.reason, "limit_reached");
  });

  it("falls back to unknown for a code it has no answer for", async () => {
    const { error } = await listCampaignContainers(
      stubQuery(postgrestError("42501")),
      CAMPAIGN,
    );

    assert.equal(error.reason, "unknown");
  });

  it("keeps the raw message as detail, for the log rather than the user", async () => {
    const { error } = await listCampaignContainers(
      stubQuery(postgrestError("42501", 'permission denied for "containers"')),
      CAMPAIGN,
    );

    assert.equal(error.detail, 'permission denied for "containers"');
  });
});

describe("listCampaignContainers", () => {
  it("asks for the columns a drawer draws and no others", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCampaignContainers(query, CAMPAIGN);

    assert.match(query.lastSelect, /visible_to_character_ids/);
    assert.match(query.lastSelect, /is_revealed/);
    // There is no `user_id` on this table, and nothing here may invent one.
    assert.ok(!query.lastSelect.includes("user_id"));
  });

  it("scopes to the one campaign", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCampaignContainers(query, CAMPAIGN);

    assert.deepEqual(query.filters, [["campaign_id", CAMPAIGN]]);
  });

  it("answers an empty shelf with an empty list, not null", async () => {
    const { data, error } = await listCampaignContainers(
      stubQuery({ data: null, error: null }),
      CAMPAIGN,
    );

    assert.deepEqual(data, []);
    assert.equal(error, null);
  });
});

describe("listContainerItems", () => {
  it("reads every named container in one round trip", async () => {
    const query = stubQuery({ data: [], error: null });
    await listContainerItems(query, [CONTAINER, OTHER]);

    assert.deepEqual(query.filters, [
      ["container_id", [CONTAINER, OTHER], "in"],
    ]);
  });

  it("never queries for an empty shelf", async () => {
    // PostgREST renders `in.()` as a syntax error, and a campaign with no
    // containers is the ordinary state of a new one.
    const query = stubQuery(postgrestError("42601"));
    const { data, error } = await listContainerItems(query, []);

    assert.deepEqual(data, []);
    assert.equal(error, null);
    assert.deepEqual(query.filters, []);
  });
});

describe("insertContainer", () => {
  it("writes the name and the kind, and lets the rest default", () => {
    const query = stubQuery({ data: { id: CONTAINER }, error: null });

    insertContainer(query, {
      campaignId: CAMPAIGN,
      container: { name: "Sunken Iron Chest", type: "chest" },
    });

    // Neither the owner nor the audience: both are the table's, and
    // `reveal_chest` and `transfer_container` are their only doors.
    assert.deepEqual(query.lastInsert, {
      campaign_id: CAMPAIGN,
      name: "Sunken Iron Chest",
      type: "chest",
    });
  });

  it("reads an RLS refusal — no row — as a miss rather than a write", async () => {
    const { data, error } = await insertContainer(
      stubQuery({ data: null, error: null }),
      { campaignId: CAMPAIGN, container: { name: "Chest", type: "chest" } },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});

describe("removeContainer", () => {
  it("reports what it removed, so RLS filtering is not a success", async () => {
    const { data, error } = await removeContainer(
      stubQuery({ data: [], error: null }),
      { campaignId: CAMPAIGN, id: CONTAINER },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });

  it("keeps the campaign filter beside the id, as a second lock", async () => {
    const query = stubQuery({ data: [{ id: CONTAINER }], error: null });
    await removeContainer(query, { campaignId: CAMPAIGN, id: CONTAINER });

    assert.deepEqual(query.filters, [
      ["id", CONTAINER],
      ["campaign_id", CAMPAIGN],
    ]);
  });
});

describe("stockContainerItem", () => {
  it("sends a change and never a total", async () => {
    const query = stubQuery({ data: 4, error: null });
    const { data } = await stockContainerItem(query, {
      containerId: CONTAINER,
      item: ITEM,
      delta: 3,
    });

    assert.equal(query.lastRpc.name, "stock_container_item");
    assert.equal(query.lastRpc.params.p_delta, 3);
    assert.deepEqual(query.lastRpc.params.p_facts, { cost: "50 gp" });
    assert.deepEqual(data, { quantity: 4 });
  });

  it("carries a take back as a negative rather than a second function", async () => {
    const query = stubQuery({ data: 0, error: null });
    const { data } = await stockContainerItem(query, {
      containerId: CONTAINER,
      item: ITEM,
      delta: -2,
    });

    assert.equal(query.lastRpc.params.p_delta, -2);
    // Zero is a stack emptied, which is not a refusal.
    assert.deepEqual(data, { quantity: 0 });
  });

  it("reads a refusal as a miss", async () => {
    const { data, error } = await stockContainerItem(
      stubQuery({ data: null, error: null }),
      { containerId: CONTAINER, item: ITEM, delta: 1 },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});

describe("transferContainer", () => {
  it("hands the bag and its seat to the one function", async () => {
    const query = stubQuery({ data: true, error: null });
    const { data } = await transferContainer(query, {
      containerId: OTHER,
      ownerCharacterId: FERN,
      seatCharacterId: FRIEREN,
    });

    assert.equal(query.lastRpc.name, "transfer_container");
    assert.deepEqual(query.lastRpc.params, {
      p_container_id: OTHER,
      p_new_owner_id: FERN,
      p_seat: FRIEREN,
    });
    assert.deepEqual(data, { ownerCharacterId: FERN });
  });

  it("puts a bag back on the table with a null owner", async () => {
    const query = stubQuery({ data: true, error: null });
    await transferContainer(query, {
      containerId: OTHER,
      ownerCharacterId: null,
    });

    assert.equal(query.lastRpc.params.p_new_owner_id, null);
    assert.equal(query.lastRpc.params.p_seat, null);
  });

  it("reads false as a miss, so a refusal cannot be told from a deletion", async () => {
    const { data, error } = await transferContainer(
      stubQuery({ data: false, error: null }),
      { containerId: OTHER, ownerCharacterId: FERN },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});

describe("revealChest and hideChest", () => {
  it("sends the audience the Dungeon Master chose", async () => {
    const query = stubQuery({ data: true, error: null });
    await revealChest(query, {
      containerId: CONTAINER,
      visibleTo: [FRIEREN, FERN],
    });

    assert.equal(query.lastRpc.name, "reveal_chest");
    assert.deepEqual(query.lastRpc.params.p_visible_char_ids, [FRIEREN, FERN]);
  });

  it("sends an empty list rather than nothing at all", async () => {
    const query = stubQuery({ data: false, error: null });
    await revealChest(query, { containerId: CONTAINER, visibleTo: undefined });

    assert.deepEqual(query.lastRpc.params.p_visible_char_ids, []);
  });

  it("names only the chest when putting it back in the dark", async () => {
    const query = stubQuery({ data: true, error: null });
    const { data } = await hideChest(query, { containerId: CONTAINER });

    assert.equal(query.lastRpc.name, "hide_chest");
    assert.deepEqual(query.lastRpc.params, { p_container_id: CONTAINER });
    assert.deepEqual(data, { containerId: CONTAINER });
  });
});

describe("takeChestItem", () => {
  it("names the row rather than the slug", async () => {
    const query = stubQuery({ data: 2, error: null });
    const { data } = await takeChestItem(query, {
      containerId: CONTAINER,
      itemId: ROW_ID,
      characterId: FRIEREN,
      quantity: 3,
    });

    assert.equal(query.lastRpc.name, "take_chest_item");
    assert.deepEqual(query.lastRpc.params, {
      p_container_id: CONTAINER,
      p_item_id: ROW_ID,
      p_target_char_id: FRIEREN,
      p_quantity: 3,
    });
    assert.deepEqual(data, { remaining: 2 });
  });

  it("tells an emptied stack from a refusal", async () => {
    const emptied = await takeChestItem(stubQuery({ data: 0, error: null }), {
      containerId: CONTAINER,
      itemId: ROW_ID,
      characterId: FRIEREN,
      quantity: 5,
    });

    assert.deepEqual(emptied.data, { remaining: 0 });

    const refused = await takeChestItem(
      stubQuery({ data: null, error: null }),
      {
        containerId: CONTAINER,
        itemId: ROW_ID,
        characterId: FRIEREN,
        quantity: 5,
      },
    );

    assert.equal(refused.data, null);
    assert.equal(refused.error.reason, "not_found");
  });
});
