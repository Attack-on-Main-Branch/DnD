/**
 * The two rests, as one door each. Failures come back as a `reason` code, not a
 * sentence.
 *
 * Both delegate to `trigger_rest`, which is where the atomicity lives: a long
 * rest is hit points AND every slot, across as many as six characters, and a
 * party half-rested because the second statement failed is worse than a party
 * that has not rested at all.
 *
 * `characterIds` is WHO — one of them, several, or the whole party. The function
 * narrows the list to this party and to the characters the caller may rest, the
 * way `reveal_chest` narrows an audience; nothing here decides it.
 */

import { classifyDatabaseError as classify } from "./database-errors.js";

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

/**
 * Whoever rested, and the numbers they woke on. An empty list is a refusal —
 * a chair that is not the caller's, or a party nobody may rest — and reads the
 * way every other refusal in this layer does.
 */
async function performRest(
  supabase,
  { campaignId, characterIds, restType, seatCharacterId = null },
) {
  const { data, error } = await supabase.rpc("trigger_rest", {
    p_campaign_id: campaignId,
    p_target_char_ids: characterIds ?? [],
    p_rest_type: restType,
    p_seat: seatCharacterId,
  });

  if (error) {
    return failure(error);
  }

  const rested = (data ?? []).map((row) => ({
    id: row.id,
    currentHp: row.current_hp,
    spellSlots: row.spell_slots,
    hitDiceSpent: row.hit_dice_spent,
  }));

  return rested.length > 0
    ? { data: rested, error: null }
    : { data: null, error: { reason: "not_found", detail: "refused" } };
}

/** An hour by the fire: what returns on the hour, and nothing else. */
export async function performShortRest(supabase, options) {
  return performRest(supabase, { ...options, restType: "short" });
}

/** A night: hit points to the character's own maximum, every slot unspent. */
export async function performLongRest(supabase, options) {
  return performRest(supabase, { ...options, restType: "long" });
}
