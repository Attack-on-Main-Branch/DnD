import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  partyExportFixture,
  EXPORT_CAMPAIGN,
  EXPORT_CHARACTER,
  EXPORT_OWNER,
} from "../party-export-fixture.js";
import { stubQuery, postgrestError } from "../supabase-stub.js";
import { readPartyExport } from "./party-export.js";

function exportClient(source, { denied = false, failedTable = null } = {}) {
  const queries = [];
  const rpcCalls = [];
  const tables = {
    campaigns: source.campaign,
    containers: source.containers,
    character_inventory: source.inventory,
    character_spells: source.spells,
    character_features: source.features,
  };
  const client = {
    from: (table) => {
      const query = stubQuery({ data: null, error: null });
      queries.push({ table, query });
      query.then = (resolve, reject) => {
        if (table === failedTable)
          return Promise.resolve(postgrestError("42P01")).then(resolve, reject);
        let data = table === "campaigns" && denied ? null : tables[table];
        if (query.lastRange)
          data = data.slice(query.lastRange[0], query.lastRange[1] + 1);
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      };
      return query;
    },
    rpc: async (name, params) => {
      rpcCalls.push({ name, params });
      return {
        data: name === "campaign_party" ? source.members : source.sheets,
        error: null,
      };
    },
  };
  return { client, queries, rpcCalls };
}

describe("DM party export reads", () => {
  it("checks campaign ownership before reading any party details", async () => {
    const { client, queries, rpcCalls } = exportClient(partyExportFixture(), {
      denied: true,
    });
    const result = await readPartyExport(client, {
      campaignId: EXPORT_CAMPAIGN,
      userId: EXPORT_OWNER,
    });
    assert.equal(result.error.reason, "not_found");
    assert.deepEqual(rpcCalls, []);
    assert.equal(queries.length, 1);
    assert.deepEqual(queries[0].query.filters, [
      ["id", EXPORT_CAMPAIGN],
      ["user_id", EXPORT_OWNER],
    ]);
    assert.ok(!queries[0].query.lastSelect.includes("user_id"));
  });

  it("derives character IDs from the party and scopes every read", async () => {
    const { client, queries, rpcCalls } = exportClient(partyExportFixture());
    const result = await readPartyExport(client, {
      campaignId: EXPORT_CAMPAIGN,
      userId: EXPORT_OWNER,
    });
    assert.equal(result.error, null);
    assert.equal(result.data.characters[0].name, "Fern");
    for (const table of [
      "character_inventory",
      "character_spells",
      "character_features",
    ]) {
      assert.deepEqual(
        queries.find((entry) => entry.table === table).query.filters,
        [["character_id", [EXPORT_CHARACTER], "in"]],
      );
    }
    assert.deepEqual(
      queries.find((entry) => entry.table === "containers").query.filters,
      [["campaign_id", EXPORT_CAMPAIGN]],
    );
    assert.ok(
      rpcCalls.every((call) => call.params.target_campaign === EXPORT_CAMPAIGN),
    );
    assert.ok(
      !queries.some((entry) =>
        ["item_documents", "character_notes", "notifications"].includes(
          entry.table,
        ),
      ),
    );
  });

  it("fails the download rather than producing a partial export after a read error", async () => {
    const { client } = exportClient(partyExportFixture(), {
      failedTable: "character_spells",
    });
    const result = await readPartyExport(client, {
      campaignId: EXPORT_CAMPAIGN,
      userId: EXPORT_OWNER,
    });
    assert.equal(result.data, null);
    assert.equal(result.error.reason, "missing_table");
  });

  it("fails when a party member's sheet could not be read", async () => {
    const source = partyExportFixture();
    source.sheets = [];
    const { client } = exportClient(source);
    const result = await readPartyExport(client, {
      campaignId: EXPORT_CAMPAIGN,
      userId: EXPORT_OWNER,
    });
    assert.equal(result.data, null);
    assert.equal(result.error.reason, "incomplete_party");
  });

  it("paginates inventory instead of truncating large parties at the API row limit", async () => {
    const source = partyExportFixture();
    source.inventory = Array.from({ length: 1001 }, (_, index) => ({
      ...source.inventory[0],
      id: `item-${index}`,
    }));
    const { client, queries } = exportClient(source);
    const result = await readPartyExport(client, {
      campaignId: EXPORT_CAMPAIGN,
      userId: EXPORT_OWNER,
    });
    assert.equal(result.error, null);
    assert.equal(result.data.characters[0].inventory.length, 1001);
    assert.deepEqual(
      queries
        .filter((entry) => entry.table === "character_inventory")
        .map((entry) => entry.query.lastRange),
      [
        [0, 499],
        [500, 999],
        [1000, 1499],
      ],
    );
  });
});
