/**
 * How each party member looks, as their Dungeon Master describes them. The
 * whole row is the Dungeon Master's, so plain table calls under RLS.
 */

import { classifyDatabaseError } from "./database-errors.js";
import { removeObject, uploadObject } from "./storage.js";

const BUCKET = "campaign-maps";
const SUBJECT = "look";

const COLUMNS = "character_id, image_url, description";

const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const ROW_LEVEL_SECURITY = "42501";

function classify(error) {
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // No membership to describe: the character left the party.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  if (error.code === ROW_LEVEL_SECURITY) {
    return "not_found";
  }

  switch (error.code) {
    case "42883":
    case "PGRST202":
      return "failed";
  }

  return classifyDatabaseError(error, "failed");
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message ?? null },
  };
}

export async function listMemberLooks(supabase, campaignId) {
  const { data, error } = await supabase
    .from("campaign_member_looks")
    .select(COLUMNS)
    .eq("campaign_id", campaignId);

  return error ? failure(error) : { data: data ?? [], error: null };
}

export async function readMemberLook(supabase, { campaignId, characterId }) {
  const { data, error } = await supabase
    .from("campaign_member_looks")
    .select(COLUMNS)
    .eq("campaign_id", campaignId)
    .eq("character_id", characterId)
    .maybeSingle();

  return error ? failure(error) : { data: data ?? null, error: null };
}

/** `imageUrl` undefined keeps the picture already there. */
export async function saveMemberLook(
  supabase,
  { campaignId, characterId, imageUrl, description },
) {
  const row = {
    campaign_id: campaignId,
    character_id: characterId,
    description: description ?? null,
    updated_at: new Date().toISOString(),
  };

  if (imageUrl !== undefined) {
    row.image_url = imageUrl;
  }

  const { data, error } = await supabase
    .from("campaign_member_looks")
    .upsert(row, { onConflict: "campaign_id,character_id" })
    .select(COLUMNS);

  if (error) {
    return failure(error);
  }

  return data?.length
    ? { data: data[0], error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

/** Answers the picture's URL, the last moment anything points at it. */
export async function clearMemberLook(supabase, { campaignId, characterId }) {
  const { data, error } = await supabase
    .from("campaign_member_looks")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("character_id", characterId)
    .select("image_url");

  if (error) {
    return failure(error);
  }

  return { data: { imageUrl: data?.[0]?.image_url ?? null }, error: null };
}

export async function uploadLookImage(supabase, { path, file }) {
  return uploadObject(supabase, {
    bucket: BUCKET,
    path,
    file,
    subject: SUBJECT,
  });
}

export async function removeLookImage(supabase, path) {
  return removeObject(supabase, { bucket: BUCKET, path, subject: SUBJECT });
}
