/**
 * Every read and write against the `campaigns` table, its shelf of
 * `campaign_maps`, and the `campaign-maps` bucket both keep their pictures in.
 * Failures come back as a `reason` code, not a sentence.
 */

import { removeObject, uploadObject } from "./storage.js";

const BUCKET = "campaign-maps";

/** What this module's storage reasons are named after — see storage.js. */
const SUBJECT = "map";

/** `user_id` is deliberately absent: it must not travel to the client. */
const COLUMNS =
  "id, title, world_description, map_url, active_map_id, created_at";

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

  if (error.message?.includes("map_limit_reached")) {
    return "map_limit_reached";
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

export async function uploadCampaignMap(supabase, { path, file }) {
  return uploadObject(supabase, {
    bucket: BUCKET,
    path,
    file,
    subject: SUBJECT,
  });
}

export async function removeCampaignMap(supabase, path) {
  return removeObject(supabase, { bucket: BUCKET, path, subject: SUBJECT });
}

/* ---------------------------------------------------------------------------
   THE SHELF OF MAPS
   --------------------------------------------------------------------------- */

/** `campaign_id` stays out: every read is already scoped to one campaign. */
const MAP_COLUMNS =
  "id, name, url, is_world_map, sort_order, grid_enabled, grid_size, " +
  "grid_luminance, fog_enabled, fog_mask_url, created_at";

/**
 * Every map this campaign keeps, world map first.
 *
 * No `.eq("user_id", …)` second lock, because there is no such column: the
 * policy in 20260920090000 answers the Dungeon Master AND the party, so this is
 * one of the few reads whose audience is wider than an owner. The ORDER is the
 * shelf's own — the world map carries a negative `sort_order`.
 */
export async function listCampaignMaps(supabase, campaignId) {
  const { data, error } = await supabase
    .from("campaign_maps")
    .select(MAP_COLUMNS)
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * One map onto the shelf. The id is the caller's because the object in storage
 * is named after it and had to be uploaded first — the same order, and the same
 * reason, as a campaign and its world map.
 */
export async function addCampaignMap(
  supabase,
  { id, campaignId, name, url, sortOrder },
) {
  const { error } = await supabase.from("campaign_maps").insert({
    id,
    campaign_id: campaignId,
    name,
    url,
    sort_order: sortOrder,
  });

  return error ? failure(error) : { data: true, error: null };
}

/** The label on a card. The world map's row takes a rename like any other. */
export async function renameCampaignMap(supabase, { id, name }) {
  const { data, error } = await supabase
    .from("campaign_maps")
    .update({ name })
    .eq("id", id)
    .select("id");

  if (error) {
    return failure(error);
  }

  return data?.length
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

/**
 * A new picture on an existing card, through the definer function for the
 * reason it gives: the world map's row is derived from `campaigns.map_url`, so
 * writing the row would be undone by the next thing that touched the column.
 *
 * Answers with the URL it replaced, which is the last moment anything points at
 * that object. Null is a refusal or a miss, deliberately the same answer.
 */
export async function replaceCampaignMap(supabase, { id, url }) {
  const { data, error } = await supabase.rpc("replace_campaign_map", {
    p_map_id: id,
    p_url: url,
  });

  if (error) {
    return failure(error);
  }

  return data === null
    ? { data: null, error: { reason: "not_found", detail: null } }
    : { data: { previousUrl: data }, error: null };
}

/**
 * A map off the shelf. `.select("url")` makes the DELETE report the row it
 * removed — the only chance to learn where the object is before nothing points
 * at it. An empty result is a miss: already gone, or never this caller's.
 */
export async function dropCampaignMap(supabase, { id }) {
  const { data, error } = await supabase
    .from("campaign_maps")
    .delete()
    .eq("id", id)
    .select("url");

  if (error) {
    return failure(error);
  }

  return data?.length
    ? { data: { url: data[0].url }, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

/**
 * What the table is looking at. `mapId` null puts the world map back, and is
 * not a refusal — `false` from the function is.
 */
export async function setActiveCampaignMap(supabase, { campaignId, mapId }) {
  const { data, error } = await supabase.rpc("set_active_campaign_map", {
    p_campaign_id: campaignId,
    p_map_id: mapId,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
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
 * One note rewritten — `updateCharacterNote`'s twin, and the reasoning is the
 * same one table up: `body` alone, `created_at` left where it was, and a row
 * that is not the caller's refused as no row rather than as a failure.
 */
export async function updateCampaignNote(supabase, { id, campaignId, body }) {
  const { data, error } = await supabase
    .from("campaign_notes")
    .update({ body })
    .eq("id", id)
    // A second lock on the same door, the way every read here carries one.
    .eq("campaign_id", campaignId)
    .select("id, body, created_at")
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}

/** The same door the other way. A note struck out is gone, not hidden. */
export async function deleteCampaignNote(supabase, { id, campaignId }) {
  const { data, error } = await supabase
    .from("campaign_notes")
    .delete()
    .eq("id", id)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}

/**
 * A map ruled, or the ruling taken off it. Through the definer function for the
 * reason `replace_campaign_map` is: RLS grants rows and never columns, so the
 * narrowest policy that would let a Dungeon Master rule a map also lets them
 * rewrite its URL from a hand-built request.
 *
 * `false` is a refusal or a miss, deliberately the same answer.
 */
export async function updateMapGridSettings(
  supabase,
  { mapId, enabled, size, luminance },
) {
  const { data, error } = await supabase.rpc("update_map_grid_settings", {
    p_map_id: mapId,
    p_enabled: enabled,
    p_size: size,
    p_luminance: luminance,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}
