import assert from "node:assert/strict";
import { test } from "node:test";
import { stubQuery } from "../supabase-stub.js";
import {
  advanceCombatTurn,
  finishCharacterTurn,
  getCampaignCombat,
} from "./combat.js";

test("finishing a player turn sends its character and expected turn to the guarded RPC", async () => {
  const client = stubQuery({ data: true, error: null });
  const result = await finishCharacterTurn(client, {
    campaignId: "campaign",
    characterId: "player",
    turnId: "expected-turn",
  });
  assert.equal(result.error, null);
  assert.deepEqual(client.lastRpc, {
    name: "finish_character_turn",
    params: {
      p_campaign_id: "campaign",
      p_character_id: "player",
      p_turn_id: "expected-turn",
    },
  });
});

test("a stale or unauthorized player turn is a refusal", async () => {
  const result = await finishCharacterTurn(
    stubQuery({ data: false, error: null }),
    {},
  );
  assert.equal(result.error.reason, "not_found");
});

test("DM turns use the serialized advance function", async () => {
  const client = stubQuery({ data: true, error: null });
  await advanceCombatTurn(client, "campaign");
  assert.equal(client.lastRpc.name, "advance_combat_turn_locked");
});

test("guidance adds only the public turn fields to the campaign read", async () => {
  const client = {
    rpc: async (name) => ({
      data: [
        name === "campaign_table"
          ? { id: "campaign", title: "Table" }
          : {
              combat_turn_id: "turn",
              next_turn_character_id: "player",
              user_id: "must-not-escape",
            },
      ],
      error: null,
    }),
  };
  const result = await getCampaignCombat(client, "campaign");
  assert.deepEqual(result.data, {
    id: "campaign",
    title: "Table",
    combat_turn_id: "turn",
    next_turn_character_id: "player",
  });
});

test("a missing additive guidance function leaves the existing table available", async () => {
  const client = {
    rpc: async (name) =>
      name === "campaign_table"
        ? { data: [{ id: "campaign" }], error: null }
        : { data: null, error: { code: "PGRST202", message: "not deployed" } },
  };
  assert.deepEqual((await getCampaignCombat(client, "campaign")).data, {
    id: "campaign",
  });
});

test("guidance failures other than a pending migration remain failures", async () => {
  const client = {
    rpc: async (name) =>
      name === "campaign_table"
        ? { data: [{ id: "campaign" }], error: null }
        : { data: null, error: { code: "08006", message: "unreachable" } },
  };
  assert.equal(
    (await getCampaignCombat(client, "campaign")).error.reason,
    "unknown",
  );
});

test("guidance reads the active token, round and turn id from one snapshot", async () => {
  const current = {
    is_in_combat: true,
    active_turn_token_id: "next",
    combat_round: 2,
    combat_turn_id: "current-turn",
    next_turn_character_id: "player",
  };
  const client = {
    rpc: async (name) => ({
      data: [
        name === "campaign_table"
          ? {
              id: "campaign",
              is_in_combat: false,
              active_turn_token_id: "old",
              combat_round: 1,
            }
          : current,
      ],
      error: null,
    }),
  };
  assert.deepEqual((await getCampaignCombat(client, "campaign")).data, {
    id: "campaign",
    ...current,
  });
});
