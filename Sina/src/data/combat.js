import { classifyDatabaseError as classify } from "./database-errors.js";
import { getCampaignTable } from "./campaigns.js";

/**
 * Beginning a fight, ending one, writing a number down and handing the turn on.
 * Failures come back as a `reason` code, not a sentence.
 *
 * EVERY WRITE IS AN RPC, for the reason every write in tokens.js is one: RLS
 * grants whole ROWS, so a policy narrow enough to let a Dungeon Master set
 * `is_in_combat` would hand them every other column of the campaign with it.
 * The definer functions in 20260926090000 are the only writers.
 *
 * `false` from one of them is a refusal and reads as `not_found`, the same
 * answer a campaign that has gone gives — a player probing somebody else's table
 * learns nothing either way.
 */

const GUIDANCE_COLUMNS = [
  "combat_turn_id",
  "next_turn_character_id",
  "is_in_combat",
  "active_turn_token_id",
  "combat_round",
];

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message ?? null },
  };
}

/** What a `false` from one of the four functions comes back as. */
const REFUSED = {
  data: null,
  error: { reason: "not_found", detail: null },
};

function answer({ data, error }) {
  if (error) {
    return failure(error);
  }

  return data ? { data: true, error: null } : REFUSED;
}

/** The cursor lands on whoever is highest, or on nothing where nobody has
    rolled yet. */
export async function startCombat(supabase, campaignId) {
  return answer(
    await supabase.rpc("start_combat", { p_campaign_id: campaignId }),
  );
}

/** The cursor cleared, the round back to one, and every number on every one of
    this campaign's maps wiped. The pieces stay where they are. */
export async function endCombat(supabase, campaignId) {
  return answer(
    await supabase.rpc("end_combat", { p_campaign_id: campaignId }),
  );
}

/** Null takes the piece back out of the fight. */
export async function setTokenInitiative(supabase, { tokenId, initiative }) {
  return answer(
    await supabase.rpc("set_token_initiative", {
      p_token_id: tokenId,
      p_init: initiative ?? null,
    }),
  );
}

/** Off the bottom is the top again, a round later. */
export async function advanceCombatTurn(supabase, campaignId) {
  let result = await supabase.rpc("advance_combat_turn_locked", {
    p_campaign_id: campaignId,
  });
  if (result.error && classify(result.error) === "missing_function") {
    result = await supabase.rpc("advance_combat_turn", {
      p_campaign_id: campaignId,
    });
  }
  return answer(result);
}

export async function getCampaignCombat(supabase, campaignId) {
  const [table, guidance] = await Promise.all([
    getCampaignTable(supabase, campaignId),
    supabase.rpc("campaign_combat_guidance", { target_campaign: campaignId }),
  ]);
  if (table.error || !table.data) return table;
  if (guidance.error) {
    // Keep the table usable while the additive migration is being deployed.
    if (
      ["missing_function", "missing_column"].includes(classify(guidance.error))
    )
      return table;
    return failure(guidance.error);
  }
  const current = guidance.data?.[0];
  return {
    data: current
      ? {
          ...table.data,
          ...Object.fromEntries(
            GUIDANCE_COLUMNS.filter((key) => Object.hasOwn(current, key)).map(
              (key) => [key, current[key]],
            ),
          ),
        }
      : table.data,
    error: null,
  };
}

export async function finishCharacterTurn(
  supabase,
  { campaignId, characterId, turnId },
) {
  return answer(
    await supabase.rpc("finish_character_turn", {
      p_campaign_id: campaignId,
      p_character_id: characterId,
      p_turn_id: turnId,
    }),
  );
}
