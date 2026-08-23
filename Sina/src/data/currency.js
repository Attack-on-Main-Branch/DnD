/**
 * Every read and write against the five coin columns on `characters`. Failures
 * come back as a `reason` code, not a sentence.
 *
 * ALL FIVE go through an RPC, and none of them for the arithmetic reason the
 * pack's do. `characters` has no UPDATE policy at all — RLS grants rows and
 * never columns, so a policy wide enough to let a Dungeon Master add a gold
 * piece would let them rewrite the name and the ability scores with it. Each
 * function in 20260823160000 is a definer whose guards ARE the permission,
 * which is the shape `set_character_health` and `set_character_level` already
 * have.
 *
 * The read is an RPC for the same reason `campaign_party` is one: the return
 * type is the column list, and the column list is the boundary.
 */

/** Postgres SQLSTATEs we can say something specific about. */
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const NUMERIC_OUT_OF_RANGE = "22003";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

/**
 * Not SQLSTATEs: PostgREST's own codes for a function or a table it has no
 * entry for. The call never reaches Postgres, which is why `42883` alone never
 * fired for an unpushed migration. See the note in data/activity.js.
 */
const FUNCTION_CACHE_MISS = "PGRST202";
const SCHEMA_CACHE_MISS = "PGRST205";

function classify(error) {
  // Past parseCoins but refused by `characters_currency_check`: a disagreement
  // between Sina/src/rules/currency.js and the migration.
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // An amount that overflowed int4 on its way to the clamp inside the function.
  if (error.code === NUMERIC_OUT_OF_RANGE) {
    return "invalid_value";
  }

  // The character or the campaign went away mid-request.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  if (error.code === UNDEFINED_TABLE || error.code === SCHEMA_CACHE_MISS) {
    return "missing_table";
  }

  // A migration written but never pushed, which is what `npm run db:list` is
  // for. The tests never reach a database, so nothing else catches it.
  if (error.code === UNDEFINED_FUNCTION || error.code === FUNCTION_CACHE_MISS) {
    return "missing_function";
  }

  // A malformed uuid: Postgres refuses the cast before considering a row, so it
  // arrives as an error. A miss, not a failure.
  if (error.code === INVALID_TEXT_REPRESENTATION) {
    return "bad_id";
  }

  return "unknown";
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

/**
 * Null from a definer function is a refusal — not the caller's purse to touch,
 * not enough in it, or no such character — and reads as `not_found`, which is
 * also what a deleted character gives. A caller must not be able to tell them
 * apart.
 */
const REFUSED = { data: null, error: { reason: "not_found", detail: null } };

/**
 * Whose purses this viewer may see, in the party's order. RLS is not what
 * decides it — `campaign_purses` is — and it decides the same thing the pack's
 * policies do: the Dungeon Master reads the whole party's, a player their own.
 *
 * `character_id` is here on purpose, unlike `user_id` elsewhere in this layer:
 * the drawer reads the party in one query and has to know whose each row is.
 */
export async function listPartyPurses(supabase, campaignId) {
  const { data, error } = await supabase.rpc("campaign_purses", {
    target_campaign: campaignId,
  });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * The Dungeon Master's one door: five denominations, in or out, for one purse
 * or for every purse at the table.
 *
 * `characterId` null is the whole party, and either way it is one transaction —
 * see `move_campaign_currency`. `campaignId` is what scopes the permission: a
 * character can sit at more than one table, so the question is "is this the
 * Dungeon Master of the campaign that character is in", and the function
 * re-checks the membership itself.
 *
 * `moved` is one row per purse touched, carrying WHAT ACTUALLY MOVED rather
 * than what was asked for — the amounts are clamped at the ceiling on the way
 * up and at zero on the way down, and the log is written from the difference.
 *
 * An empty list is nothing moved. That is an empty party, or a campaign that is
 * not the caller's, and this layer cannot tell them apart: `owns_campaign` is
 * answered inside the function and refusing looks exactly like finding nobody.
 */
export async function moveCampaignCurrency(
  supabase,
  { campaignId, characterId = null, coins, take = false },
) {
  const { data, error } = await supabase.rpc("move_campaign_currency", {
    p_campaign_id: campaignId,
    p_character: characterId,
    p_cp: coins.cp,
    p_sp: coins.sp,
    p_ep: coins.ep,
    p_gp: coins.gp,
    p_pp: coins.pp,
    p_take: take,
  });

  if (error) {
    return failure(error);
  }

  return { data: { moved: data ?? [] }, error: null };
}

/**
 * Coins spent, by the player from their own purse or by the Dungeon Master from
 * one of the party's: one call for both, because what differs is the sentence
 * written in the log afterwards and not what happens to the row.
 *
 * `taken` is WHAT LEFT THE PURSE, not what remains in it — the log is written
 * from it, so it has to be the difference. Asking for more than is there empties
 * the purse rather than failing, and reports what that came to.
 */
export async function spendCurrency(supabase, { characterId, coin, amount }) {
  const { data, error } = await supabase.rpc("spend_currency", {
    p_char_id: characterId,
    p_currency_type: coin,
    p_amount: amount,
  });

  if (error) {
    return failure(error);
  }

  return data === null ? REFUSED : { data: { taken: data }, error: null };
}

/**
 * One purse to another, in one transaction. Which of them the caller may empty
 * is `transfer_currency`'s to decide — it re-checks that both characters are at
 * the same table and that this one is the caller's to give from, so a
 * recipient's id arriving from a list of names is not a permission.
 *
 * `false` is a refusal — not enough of it, not at the same table, or not the
 * caller's to move — and comes back as `not_found` because the three must not
 * be distinguishable from outside.
 */
export async function transferCurrency(
  supabase,
  { fromCharacterId, toCharacterId, coin, amount },
) {
  const { data, error } = await supabase.rpc("transfer_currency", {
    p_from_char_id: fromCharacterId,
    p_to_char_id: toCharacterId,
    p_currency_type: coin,
    p_amount: amount,
  });

  if (error) {
    return failure(error);
  }

  return data ? { data: { amount }, error: null } : REFUSED;
}
