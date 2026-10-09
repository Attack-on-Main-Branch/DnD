import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getCampaign, setCampaignDice } from "./campaigns.js";
import { stubQuery } from "../supabase-stub.js";

describe("campaign dice", () => {
  const dice = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    diceColor: "#00ff88",
    diceSkin: "gold-rimmed",
  };

  it("reads the dice with the owner's campaign without exposing user_id", async () => {
    const query = stubQuery({ data: null, error: null });
    await getCampaign(query, { id: dice.id, userId: "owner" });

    const columns = query.lastSelect.split(", ");
    assert.ok(columns.includes("dice_color"));
    assert.ok(columns.includes("dice_skin"));
    assert.ok(!columns.includes("user_id"));
    assert.deepEqual(query.filters, [
      ["id", dice.id],
      ["user_id", "owner"],
    ]);
  });

  it("writes only dice through the ownership-checked function", async () => {
    const query = stubQuery({ data: true, error: null });
    const result = await setCampaignDice(query, dice);

    assert.deepEqual(query.lastRpc, {
      name: "set_campaign_dice",
      params: {
        target_campaign: dice.id,
        new_dice_color: dice.diceColor,
        new_dice_skin: dice.diceSkin,
      },
    });
    assert.deepEqual(result, { data: true, error: null });
  });

  it("reports a refused write as not found", async () => {
    const query = stubQuery({ data: false, error: null });
    const result = await setCampaignDice(query, dice);

    assert.equal(result.data, null);
    assert.equal(result.error.reason, "not_found");
  });

  for (const [code, reason] of [
    ["23514", "invalid_value"],
    ["23503", "not_found"],
    ["PGRST202", "missing_function"],
  ]) {
    it(`classifies ${code} without exposing the database message`, async () => {
      const query = stubQuery({
        data: null,
        error: { code, message: "detail" },
      });
      const result = await setCampaignDice(query, dice);

      assert.equal(result.error.reason, reason);
    });
  }
});
