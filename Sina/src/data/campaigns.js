/**
 * Every read and write against the `campaigns` table and the `campaign-maps`
 * bucket.
 *
 * Failures come back as a `reason` code rather than a sentence, the same as
 * characters.js: what went wrong is a backend fact, how to phrase it for a
 * person is a frontend decision.
 */

const BUCKET = "campaign-maps";

/** One year. See the note on the upload for why that is safe here. */
const MAP_CACHE_SECONDS = 31536000;

/**
 * `user_id` is deliberately absent, as it is for characters: nothing the client
 * renders needs it, and not sending it keeps a uuid off the page.
 */
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

  // The party's primary key is (campaign_id, character_id), so this is the
  // database saying the character is already in it — not something the caller
  // has to fix, just a click that had nothing to do.
  if (error.code === UNIQUE_VIOLATION) {
    return "already_added";
  }

  // A character_id that no longer names a row. Between finding a character by
  // handle and adding it, its player can have retired it.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  // Raised by the campaigns_enforce_limit trigger. It has no SQLSTATE of its
  // own, so this is matched on the message — if that string changes in the
  // migration, this is what stops recognising it.
  if (error.message?.includes("campaign_limit_reached")) {
    return "limit_reached";
  }

  // The same, from campaign_members_enforce_limit. Told apart from the one
  // above because they are two ceilings and two different sentences.
  if (error.message?.includes("party_limit_reached")) {
    return "party_full";
  }

  if (error.code === UNDEFINED_TABLE) {
    return "missing_table";
  }

  // `search_characters` is created by a migration. Without it the search fails
  // in a way that reads as "no such character", which would send somebody
  // hunting for a typo in a name that is perfectly good.
  if (error.code === UNDEFINED_FUNCTION) {
    return "missing_function";
  }

  // A malformed id — /dashboard/campaign/foo against a uuid column. Postgres
  // refuses the cast before considering a row, so it arrives as an error rather
  // than an empty result. A miss, not a failure: without this a hand-typed URL
  // answers 500 where it should answer 404.
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
 * One campaign, scoped to its owner.
 *
 * `maybeSingle` keeps a missing row a miss rather than a crash, and the
 * `user_id` filter means someone else's id answers the same way a deleted one
 * does — which is what lets the route show 404 rather than 403 and avoid
 * confirming that the campaign exists at all.
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
 * Writes the row, with the id chosen by the caller rather than the database.
 *
 * That is what lets the map be uploaded to its final path *before* the row
 * exists: the object is named after the campaign, so the name has to be known
 * first. The alternative — insert, upload, then write the URL back — would need
 * an UPDATE policy on the table, and the migration deliberately does not grant
 * one while nothing edits a campaign.
 */
export async function insertCampaign(supabase, { id, userId, values, mapUrl }) {
  const { error } = await supabase.from("campaigns").insert({
    id,
    user_id: userId,
    title: values.title,
    // An empty textarea is absence, not an empty world. The column is nullable
    // precisely so the two can be told apart later.
    world_description: values.worldDescription || null,
    map_url: mapUrl ?? null,
  });

  return error ? failure(error) : { data: { id }, error: null };
}

/**
 * Deletes one of the caller's campaigns, and reports what its map was.
 *
 * `.select("map_url")` makes the DELETE hand back the row it removed, which is
 * the only chance to learn the map's location: after this statement the row is
 * gone and the object in the bucket has nothing pointing at it. An empty result
 * is `not_found` — either it was already deleted, or it was never this caller's,
 * and RLS makes those indistinguishable on purpose.
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
 * Puts the map in the bucket and hands back the URL to store.
 *
 * `upsert: false`, because the path carries a fresh uuid: if something is
 * already there, the id has been reused and overwriting it would be the wrong
 * repair. Better to fail and say so.
 *
 * `contentType` is passed explicitly. Storage infers it from the extension
 * otherwise, and a file that arrived through a Server Action has been through
 * FormData — where the browser's type survives, but nothing guarantees the name
 * still matches it.
 */
export async function uploadCampaignMap(supabase, { path, file }) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,

    /*
     * A year, against a default of one hour.
     *
     * These URLs never change what they point at: the object name carries the
     * campaign's uuid, this upload is `upsert: false`, and replacing a map
     * would mean a new campaign with a new id. An hour meant a full re-download
     * of the map for anyone who came back to the dashboard the next morning.
     *
     * Seconds only. The SDK builds the header as `max-age=${cacheControl}`, so
     * `immutable` cannot be reached through it — a year of max-age is as close
     * as this API gets, and it is close enough that no ordinary navigation will
     * revalidate.
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
 * Best-effort cleanup for a map whose row never got written.
 *
 * Returns nothing and reports nothing: it runs on a path where something has
 * already gone wrong, and the caller has a more useful failure to tell the user
 * about than this one. What it prevents is an orphaned object nobody will ever
 * reference and nobody will ever look for.
 */
export async function removeCampaignMap(supabase, path) {
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // Nothing to do. The object is unreferenced either way.
  }
}

/**
 * Storage speaks HTTP, not SQLSTATE, and its error shape is looser than
 * PostgREST's — hence the string matching. Each of these is a different thing
 * for the operator to fix, which is the whole reason they are told apart.
 */
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
 * The party, with each character's details alongside the membership row.
 *
 * One request rather than two: PostgREST embeds `characters` through the
 * foreign key, so the round trip that fetches the membership fetches who is in
 * it. The column list is spelled out for the same reason it is everywhere else
 * here — `user_id` must not travel to the client, and `characters(*)` would
 * send it.
 *
 * Two policies have to agree for this to return anything: the membership rows
 * are readable because the campaign is the caller's, and the characters are
 * readable because they are in it. Neither alone is enough, which is the point.
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

  // Flattened, so the caller gets a list of characters rather than a list of
  // rows that each contain one.
  const members = (data ?? [])
    .filter((row) => row.characters)
    .map((row) => ({ ...row.characters, addedAt: row.added_at }));

  return { data: members, error: null };
}

/**
 * Characters matching part of a name, part of a tag, or both.
 *
 * An RPC rather than a select, because before a character is in the party there
 * is no membership row to authorise reading it — the policy that lets a DM see
 * their party cannot help find someone to add to it. The function is SECURITY
 * DEFINER, which makes its shape the security boundary rather than RLS: see the
 * migration for the guards, and for what a prefix search costs against the
 * exact-handle lookup it replaced.
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
 * The campaigns one of the caller's own characters has been added to.
 *
 * The mirror image of `listPartyMembers`, and it needs two policies of its own:
 * one letting a player read the membership rows for characters they own,
 * another letting them read the titles of the campaigns those rows point at.
 * Both arrived with 20260818120000; without them this returns an empty list
 * rather than failing, which is the quiet way an RLS gap shows up.
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
 * Adds a character to a campaign.
 *
 * `campaign_id` is checked against the caller by the insert policy, so a
 * campaign that is not theirs is refused by the database rather than by
 * anything above it. Nothing here checks the character: any character may be
 * added by anyone holding its handle, which is what a handle is for.
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
