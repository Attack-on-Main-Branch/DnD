/**
 * Every read and write against `campaign_activity_logs`. Failures come back as
 * a `reason` code, not a sentence.
 *
 * The write goes through an RPC and the RPC is a definer, for the reason
 * 20260823090000_campaign_activity_log.sql gives: the actor's name is derived
 * from the row rather than taken from the caller, and the payload is built by
 * the function rather than composed here. There is no INSERT policy to write
 * against even if this wanted to.
 */

import { classifyDatabaseError } from "./database-errors.js";

/**
 * No `user_id` on this table and nothing here may invent one. `campaign_id`
 * stays out too — every read is already filtered to one campaign, and the panel
 * has no use for it.
 *
 * `actor_character` is the seat, and the panel draws a face from it. It names a
 * character the reader can already see on a card beside the log, which is why
 * it may travel where the owner behind it may not.
 */
const COLUMNS =
  "id, actor_character, actor_name, actor_type, action_type, payload, created_at";

function classify(error) {
  if (error.code === "42703") {
    return "unknown";
  }

  return classifyDatabaseError(error);
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

/**
 * Newest first, which is the order the panel stacks them in and the order the
 * purge trigger keeps them by.
 *
 * `limit` is a second belt: the trigger already holds the table to
 * MAX_ACTIVITY_ENTRIES, so this only matters in the window between an insert
 * and the purge in the same transaction — and it keeps the page honest if that
 * ceiling is ever raised in the database alone.
 */
export async function listCampaignActivity(supabase, campaignId, limit) {
  const { data, error } = await supabase
    .from("campaign_activity_logs")
    .select(COLUMNS)
    .eq("campaign_id", campaignId)
    .neq("action_type", "max_hp_change")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * One entry. Every argument is sent on every call, including the nulls: the
 * function has no defaults, and PostgREST resolves an overload by the exact set
 * of keys it is given — which is also why 20260823120000 DROPS the nine-argument
 * version rather than leaving it standing beside the eleven.
 *
 * A level change carries both ends of the sentence, and the resulting level
 * cannot be re-read from the row inside the function: two presses in quick
 * succession would both find whatever the second one wrote.
 *
 * A coin carries a denomination and an amount, and never a balance — the log
 * says what happened, and the badge beside it already says where that left
 * them. 20260823180000 is the file that DROPS the eleven-argument version.
 *
 * A spell carries its name, the slot it was cast FROM and what it threw, and
 * names nobody. 20260825120000 DROPS the thirteen-argument version, and
 * 20260826120000 the fifteen.
 *
 * A roll carries HOW MANY dice as well as which, because a total is only
 * believable against a count: 14 is a face no d6 has and a perfectly ordinary
 * 3d6. 20260902090000 DROPS the seventeen-argument version.
 *
 * `false` from the function is a refusal — a seat the caller is not in, a die
 * that has no such face, a target who has left the party — and reads here as
 * `not_found`, which is also what a deleted campaign gives. A caller must not
 * be able to tell those apart, and none of them is worth interrupting the
 * player over: see the note on `recordActivity` in Maria.
 */
export async function recordCampaignActivity(
  supabase,
  {
    campaignId,
    actorCharacterId = null,
    action,
    targetCharacterId = null,
    itemName = null,
    quantity = null,
    die = null,
    diceCount = null,
    value = null,
    delta = null,
    level = null,
    levelDelta = null,
    coin = null,
    coinAmount = null,
    spellName = null,
    spellLevel = null,
    spellDamage = null,
    spellSave = null,
  },
) {
  const { data, error } = await supabase.rpc("record_campaign_activity", {
    target_campaign: campaignId,
    actor_character: actorCharacterId,
    action,
    target_character: targetCharacterId,
    item_name: itemName,
    item_quantity: quantity,
    die_type: die,
    dice_count: diceCount,
    roll_value: value,
    hp_delta: delta,
    level_value: level,
    level_delta: levelDelta,
    coin_type: coin,
    coin_amount: coinAmount,
    spell_name: spellName,
    spell_level: spellLevel,
    spell_damage: spellDamage,
    spell_save: spellSave,
  });

  if (error) {
    return failure(error);
  }

  return data === true
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: "refused" } };
}
