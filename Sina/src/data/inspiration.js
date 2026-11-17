/**
 * The one write against `characters.inspiration`. Failures come back as a
 * `reason` code, not a sentence.
 *
 * An RPC and a definer, for the reason 20260821140000 gives about hit points:
 * RLS grants rows and never columns, so an UPDATE policy narrow enough to admit
 * this one would admit the name, the race and the backstory beside it. It is
 * also where the asymmetry lives — a player spends their own and may not hand
 * one back — see `sina/rules/inspiration`.
 */

import { classifyDatabaseError as classify } from "./database-errors.js";

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

/**
 * One mark, given or spent. A CHANGE and never a total: the database adds it to
 * the row it has locked, so two presses in the same breath stack rather than one
 * overwriting the other.
 *
 * Null is a refusal — a character who is not the caller's to write for, a player
 * reaching for a mark they may only spend, or one that left the party between
 * the press and the call. A caller must not be able to tell those apart.
 */
export async function moveCharacterInspiration(
  supabase,
  { campaignId, characterId, delta },
) {
  const { data, error } = await supabase.rpc("move_character_inspiration", {
    p_char_id: characterId,
    p_delta: delta,
    p_campaign: campaignId,
  });

  if (error) {
    return failure(error);
  }

  return data === null
    ? { data: null, error: { reason: "not_found", detail: "refused" } }
    : { data: { inspiration: data }, error: null };
}
