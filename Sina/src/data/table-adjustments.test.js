import assert from "node:assert/strict";
import { test } from "node:test";
import { stubQuery, postgrestError } from "../supabase-stub.js";
import {
  listTokenHealth,
  changeTokenHealth,
  writeTokenTemplate,
  changeCharacterProficiency,
} from "./table-adjustments.js";

test("private HP reads have explicit columns and campaign filters", async () => {
  for (const templates of [true, false]) {
    const query = stubQuery({ data: [], error: null });
    const result = await listTokenHealth(query, "campaign", templates);
    assert.deepEqual(result.data, []);
    assert.deepEqual(query.filters, [["campaign_id", "campaign"]]);
    assert.equal(
      query.lastSelect,
      templates ? "template_id, max_hp" : "token_id, current_hp, max_hp",
    );
    assert.ok(!query.lastSelect.includes("user_id"));
  }
});

test("health changes use an atomic delta RPC and report refusals", async () => {
  const query = stubQuery({ data: null, error: null });
  const result = await changeTokenHealth(query, "enemy", -8);
  assert.deepEqual(query.lastRpc, {
    name: "change_token_health",
    params: { p_token_id: "enemy", p_delta: -8 },
  });
  assert.equal(result.error.reason, "not_found");
  assert.equal(
    (await changeTokenHealth(stubQuery(postgrestError("23514")), "enemy", 0))
      .error.reason,
    "invalid_value",
  );
});

test("template picture, name and private HP save in one transaction", async () => {
  const query = stubQuery({ data: { id: "enemy" }, error: null });
  await writeTokenTemplate(query, {
    id: "enemy",
    campaignId: "campaign",
    name: "Goblin",
    maxHp: 24,
    editing: true,
  });
  assert.deepEqual(query.lastRpc.params, {
    p_id: "enemy",
    p_campaign_id: "campaign",
    p_name: "Goblin",
    p_image_url: null,
    p_max_hp: 24,
    p_editing: true,
  });
});

test("first proficiency edit derives the baseline from the authorized character", async () => {
  const calls = [];
  const client = {
    rpc: async (name, params) => {
      calls.push({ name, params });
      return {
        data:
          name === "read_character_proficiencies"
            ? {
                class_id: "wizard",
                custom_proficiencies: { weapons: ["Whips"] },
              }
            : {},
        error: null,
      };
    },
  };
  await changeCharacterProficiency(client, {
    campaignId: "c",
    characterId: "hero",
    group: "weapons",
    name: "Daggers",
    remove: true,
  });
  assert.equal(calls[1].name, "change_character_proficiency");
  assert.ok(calls[1].params.p_base.includes("Daggers"));
  assert.ok(calls[1].params.p_base.includes("Whips"));
  assert.equal(calls[1].params.p_remove, true);
});
