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
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

function classify(error) {
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // The party's primary key is (campaign_id, character_id).
  if (error.code === UNIQUE_VIOLATION) {
    return "already_added";
  }

  // A character retired between being found by handle and being added.
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

  if (error.code === UNDEFINED_FUNCTION) {
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
 * Best-effort cleanup for a map whose row never got written. Reports nothing:
 * the caller already has a more useful failure to tell the user about.
 */
export async function removeCampaignMap(supabase, path) {
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // The object is unreferenced either way.
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
 * PostgREST embeds `characters` through the foreign key, so one round trip
 * fetches the membership and who is in it. The column list is spelled out
 * because `characters(*)` would send `user_id`.
 *
 * Two policies must agree for this to return anything: the membership rows are
 * readable because the campaign is the caller's, the characters because they
 * are in it. Neither alone is enough.
 */
export async function listPartyMembers(supabase, campaignId) {
  const { data, error } = await supabase
    .from("campaign_members")
    .select(
      "character_id, added_at, characters(id, name, discriminator, race, archetype, class_id, color_theme)",
    )
    .eq("campaign_id", campaignId)
    .order("added_at", { ascending: true });

  if (error) {
    return failure(error);
  }

  const members = (data ?? [])
    .filter((row) => row.characters)
    .map((row) => ({ ...row.characters, addedAt: row.added_at }));

  return { data: members, error: null };
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

/**
 * The insert policy checks `campaign_id` against the caller, so a campaign that
 * is not theirs is refused by the database. The character is deliberately
 * unchecked: anyone holding a handle may add it, which is what a handle is for.
 */
export async function addPartyMember(supabase, { campaignId, characterId }) {
  const { error } = await supabase.from("campaign_members").insert({
    campaign_id: campaignId,
    character_id: characterId,
  });

  return error ? failure(error) : { data: { characterId }, error: null };
}

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
