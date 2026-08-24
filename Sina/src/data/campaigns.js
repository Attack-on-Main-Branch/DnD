/**
 * Every read and write against the `campaigns` table and the `campaign-maps`
 * bucket. Failures come back as a `reason` code, not a sentence.
 */

const BUCKET = "campaign-maps";

/** One year. See the note on the upload for why that is safe here. */
const MAP_CACHE_SECONDS = 31536000;

/** `user_id` is deliberately absent: it must not travel to the client. */
const COLUMNS = "id, title, world_description, map_url, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

/** Not a SQLSTATE: PostgREST's own code for a function it has no entry for,
    so the call never reaches Postgres and `42883` alone never fires. */
const FUNCTION_CACHE_MISS = "PGRST202";

function classify(error) {
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // Only reachable from `insertCampaign`, whose id this module generates: a
  // collision means the same uuid came round twice. The party's own duplicate
  // is raised by `send_campaign_invite` now and classified next door.
  if (error.code === UNIQUE_VIOLATION) {
    return "already_added";
  }

  // A campaign or character that went away mid-request.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  // Trigger-raised, so matched on the message: these have no SQLSTATE of their
  // own and stop being recognised if the migration changes the string.
  if (error.message?.includes("campaign_limit_reached")) {
    return "limit_reached";
  }

  if (error.message?.includes("party_limit_reached")) {
    return "party_full";
  }

  if (error.code === UNDEFINED_TABLE) {
    return "missing_table";
  }

  // A migration written but never pushed.
  if (error.code === UNDEFINED_COLUMN) {
    return "missing_column";
  }

  if (error.code === UNDEFINED_FUNCTION || error.code === FUNCTION_CACHE_MISS) {
    return "missing_function";
  }

  // A malformed uuid: Postgres refuses the cast before considering a row, so it
  // arrives as an error. A miss, not a failure — 404 rather than 500.
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

export async function listCampaigns(supabase, userId) {
  const { data, error } = await supabase
    .from("campaigns")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * The `user_id` filter makes someone else's id answer the same way a deleted
 * one does, so the route can 404 rather than confirm the campaign exists.
 */
export async function getCampaign(supabase, { id, userId }) {
  const { data, error } = await supabase
    .from("campaigns")
    .select(COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return error ? failure(error) : { data, error: null };
}

/**
 * The id comes from the caller, not the database, so the map can be uploaded to
 * its final path before the row exists. Insert-then-update would need an UPDATE
 * policy, which the migration deliberately withholds while nothing edits a
 * campaign.
 */
export async function insertCampaign(supabase, { id, userId, values, mapUrl }) {
  const { error } = await supabase.from("campaigns").insert({
    id,
    user_id: userId,
    title: values.title,
    // An empty textarea is absence, not an empty world.
    world_description: values.worldDescription || null,
    map_url: mapUrl ?? null,
  });

  return error ? failure(error) : { data: { id }, error: null };
}

/**
 * A campaign as its Dungeon Master rewrote it. A definer function rather than
 * an UPDATE policy: RLS grants rows and never columns, so a policy wide enough
 * to change the title would let its holder rewrite `user_id` too. The
 * parameter list is the edit.
 *
 * `changeMap` separates "no new map" from "the map was removed" — both arrive
 * as a null `mapUrl`, and only one should clear the column. The previous URL
 * comes back so the caller can delete the object it pointed at.
 */
export async function updateCampaign(
  supabase,
  { id, values, mapUrl = null, changeMap = false },
) {
  const { data, error } = await supabase.rpc("update_campaign", {
    target_campaign: id,
    new_title: values.title,
    new_world_description: values.worldDescription || null,
    new_map_url: mapUrl,
    change_map: changeMap,
  });

  if (error) {
    return failure(error);
  }

  // `returns table` is a set: a refusal and a miss both come back as no row.
  const row = data?.[0];

  if (!row?.updated) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data: { previousMapUrl: row.previous_map_url }, error: null };
}

/**
 * `.select("map_url")` makes the DELETE return the removed row — the only
 * chance to learn the map's location before nothing points at it. An empty
 * result is `not_found`: already deleted, or never this caller's, and RLS makes
 * those indistinguishable on purpose.
 */
export async function removeCampaign(supabase, { id, userId }) {
  const { data, error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("map_url");

  if (error) {
    return failure(error);
  }

  if (!data || data.length === 0) {
    return { data: null, error: { reason: "not_found", detail: "no row" } };
  }

  return { data: { mapUrl: data[0].map_url }, error: null };
}

/**
 * `upsert: false` because the path carries a fresh uuid — something already
 * there means a reused id, and overwriting would be the wrong repair.
 * `contentType` is explicit: Storage otherwise infers it from the extension,
 * and a FormData filename need not match the browser's type.
 */
export async function uploadCampaignMap(supabase, { path, file }) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,

    /*
     * A year, against a default of one hour. These URLs never change what they
     * point at, and the SDK builds the header as `max-age=${cacheControl}`, so
     * `immutable` is unreachable through this API.
     */
    cacheControl: `${MAP_CACHE_SECONDS}`,
  });

  if (error) {
    return {
      data: null,
      error: { reason: classifyStorage(error), detail: error.message },
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { data: { url: data.publicUrl, path }, error: null };
}

/**
 * Cleanup for a map whose campaign is gone or never got written.
 *
 * Best-effort for the caller — neither one has anything better to tell the user
 * than the failure that brought them here — but it reports, because a storage
 * client returns `{ error }` rather than throwing, and swallowing that leaves
 * orphaned objects nobody can see. The `catch` stays for the transport failure
 * that does throw: cleanup must not take the caller down with it.
 */
export async function removeCampaignMap(supabase, path) {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);

    return error
      ? { error: { reason: classifyStorage(error), detail: error.message } }
      : { error: null };
  } catch (thrown) {
    return { error: { reason: "map_failed", detail: String(thrown) } };
  }
}

/** Storage speaks HTTP, not SQLSTATE, hence the string matching. */
function classifyStorage(error) {
  const status = Number(error.statusCode ?? error.status);
  const message = String(error.message ?? "").toLowerCase();

  if (status === 404 || message.includes("bucket not found")) {
    return "missing_bucket";
  }

  if (status === 409 || message.includes("already exists")) {
    return "map_exists";
  }

  if (status === 401 || status === 403 || message.includes("row-level")) {
    return "map_denied";
  }

  if (status === 413 || message.includes("maximum allowed size")) {
    return "map_too_large";
  }

  return "map_failed";
}

/**
 * A campaign as its party sees it: the title, the map, and whether the caller
 * is the Dungeon Master. No `user_id` filter and none wanted — the function
 * answers for the owner and for anyone with a character in the party alike, and
 * gives everyone else no row, which reads as a miss.
 *
 * An RPC because RLS grants whole rows: a SELECT policy wide enough to let a
 * player read the title would hand them `world_description` and the owner's
 * `user_id` with it. See 20260821120000_campaign_table.sql.
 */
export async function getCampaignTable(supabase, campaignId) {
  const { data, error } = await supabase.rpc("campaign_table", {
    target_campaign: campaignId,
  });

  if (error) {
    return failure(error);
  }

  // `returns table` is a set, so a hit is one row and a miss is none.
  return { data: data?.[0] ?? null, error: null };
}

/**
 * An RPC rather than an embed, and for the same reason `searchCharacters` is
 * one: RLS grants whole rows, so a policy wide enough to let a DM read a party
 * member also let them read that player's `user_id`, backstory and personality.
 * The function's return type is the column list — see
 * 20260821120000_campaign_table.sql, which widened it from the Dungeon Master
 * to the whole party.
 */
export async function listPartyMembers(supabase, campaignId) {
  const { data, error } = await supabase.rpc("campaign_party", {
    target_campaign: campaignId,
  });

  if (error) {
    return failure(error);
  }

  const members = (data ?? []).map(({ added_at, ...character }) => ({
    ...character,
    addedAt: added_at,
  }));

  return { data: members, error: null };
}

/**
 * The party's ability scores and skills, in party order. The Dungeon Master's
 * read alone — `campaign_sheets` answers the campaign's owner and hands
 * everybody else no rows, which is why it is a second RPC rather than more
 * columns on `campaign_party`. A player reads their own via `getCharacter`.
 */
export async function listPartySheets(supabase, campaignId) {
  const { data, error } = await supabase.rpc("campaign_sheets", {
    target_campaign: campaignId,
  });

  if (error) {
    return failure(error);
  }

  return { data: data ?? [], error: null };
}

/**
 * An RPC, not a select: before a character is in the party there is no
 * membership row to authorise reading it. `search_characters` is SECURITY
 * DEFINER, so its shape is the security boundary rather than RLS — see the
 * migration for the guards.
 */
export async function searchCharacters(
  supabase,
  { namePrefix, discriminatorPrefix },
) {
  const { data, error } = await supabase.rpc("search_characters", {
    name_prefix: namePrefix,
    discriminator_prefix: discriminatorPrefix,
  });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * Needs two policies from 20260818120000: one to read membership rows for
 * characters you own, another to read those campaigns' titles. Without them
 * this returns an empty list rather than failing — how an RLS gap shows up.
 */
export async function listCampaignsForCharacter(supabase, characterId) {
  const { data, error } = await supabase
    .from("campaign_members")
    .select("campaigns(id, title)")
    .eq("character_id", characterId);

  if (error) {
    return failure(error);
  }

  return {
    data: (data ?? []).map((row) => row.campaigns).filter(Boolean),
    error: null,
  };
}

/*
 * There is deliberately no `addPartyMember` here any more. A character joins a
 * party by accepting an invitation, which is one transaction over in
 * Sina/src/data/notifications.js -- and 20260820120000 withdrew the Dungeon
 * Master's INSERT policy on this table, so a direct insert would be refused by
 * the database as well as absent from this file.
 */

export async function removePartyMember(supabase, { campaignId, characterId }) {
  const { data, error } = await supabase
    .from("campaign_members")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("character_id", characterId)
    .select("character_id");

  if (error) {
    return failure(error);
  }

  if (!data || data.length === 0) {
    return { data: null, error: { reason: "not_found", detail: "no row" } };
  }

  return { data: { characterId }, error: null };
}

/**
 * The Dungeon Master's notes on their own table, newest first — the other half
 * of listCharacterNotes. A campaign rather than a character, because a Dungeon
 * Master has no character to write from, and no sheet for these to appear on.
 */
export async function listCampaignNotes(supabase, campaignId) {
  const { data, error } = await supabase
    .from("campaign_notes")
    .select("id, body, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * `created_at` is deliberately absent from the insert — the column's default is
 * the database's clock, which is the one every reader's timestamp is formatted
 * from.
 */
export async function insertCampaignNote(supabase, { campaignId, body }) {
  const { data, error } = await supabase
    .from("campaign_notes")
    .insert({ campaign_id: campaignId, body })
    .select("id, body, created_at")
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  // RLS refuses an insert for somebody else's campaign by returning no row
  // rather than by failing.
  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}

/**
 * Every mark on this campaign's map. One per seat, so a full table is seven
 * rows at the outside — no order, no limit, nothing worth paginating.
 *
 * A plain select rather than an RPC, unlike `campaign_party` above, because
 * there is no column here to withhold: a campaign, a character and a point are
 * all already on the board. The SELECT policy answers for the whole party.
 */
export async function listCampaignMarks(supabase, campaignId) {
  const { data, error } = await supabase
    .from("campaign_marks")
    .select("character_id, x, y, placed_at")
    .eq("campaign_id", campaignId);

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * One seat's mark, moved to a new point or placed for the first time. A null
 * `characterId` is the Dungeon Master's chair, as everywhere at this table.
 *
 * `false` is a refusal, not a failure: the function writes nothing for a caller
 * who is not in that chair, which reads here as `not_found` — the same answer a
 * character who has left the party gives.
 */
export async function placeCampaignMark(
  supabase,
  { campaignId, characterId, x, y },
) {
  const { data, error } = await supabase.rpc("place_campaign_mark", {
    target_campaign: campaignId,
    target_character: characterId,
    mark_x: x,
    mark_y: y,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: { characterId, x, y }, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

/** The other half. Yours to clear, or the Dungeon Master's over any of them. */
export async function clearCampaignMark(supabase, { campaignId, characterId }) {
  const { data, error } = await supabase.rpc("clear_campaign_mark", {
    target_campaign: campaignId,
    target_character: characterId,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: { characterId }, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}
