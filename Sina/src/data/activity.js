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

/**
 * No `user_id` on this table and nothing here may invent one. `campaign_id`
 * stays out too — every read is already filtered to one campaign, and the panel
 * has no use for it.
 */
const COLUMNS = "id, actor_name, actor_type, action_type, payload, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

/**
 * Not a SQLSTATE: PostgREST's own code for a table it has no entry for. A
 * request for one never reaches Postgres, so there is nothing for Postgres to
 * report — which is why `42P01` alone never fired here against a project this
 * migration had not been pushed to. The four data modules next door predate the
 * observation and still test only for the SQLSTATE.
 */
const SCHEMA_CACHE_MISS = "PGRST205";

/** The same, for a FUNCTION it has no entry for. `42883` never fires either. */
const FUNCTION_CACHE_MISS = "PGRST202";

function classify(error) {
  // Past the rules layer but refused by the bounds CHECK: a disagreement
  // between Sina/src/rules/activity.js and the migration.
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // The campaign went away between the deed and the entry describing it.
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
    value = null,
    delta = null,
    level = null,
    levelDelta = null,
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
    roll_value: value,
    hp_delta: delta,
    level_value: level,
    level_delta: levelDelta,
  });

  if (error) {
    return failure(error);
  }

  return data === true
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: "refused" } };
}
