/**
 * The scene painter's rows: the camera on each battle map, what each piece is
 * doing, the one-at-a-time claim, and the painted scenes on the shelf. Every
 * write is an RPC; both staging tables are the Dungeon Master's alone, and the
 * definer functions in 20261005120000 are their only writers.
 */

import { removeObject, uploadObject } from "./storage.js";

const BUCKET = "campaign-maps";

/** What this module's storage reasons are named after — see storage.js. */
const SUBJECT = "scene";

const CAMERA_COLUMNS = "map_id, world_x, world_y, facing, note";
const DIRECTION_COLUMNS = "token_id, direction";

const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";
const TABLE_CACHE_MISS = "PGRST205";
const FUNCTION_CACHE_MISS = "PGRST202";

function classify(error) {
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  // Trigger-raised, so matched on the message.
  if (error.message?.includes("scene_takes_no_pieces")) {
    return "scene_takes_no_pieces";
  }

  if (error.code === UNDEFINED_TABLE || error.code === TABLE_CACHE_MISS) {
    return "missing_table";
  }

  if (error.code === UNDEFINED_COLUMN) {
    return "missing_column";
  }

  if (error.code === UNDEFINED_FUNCTION || error.code === FUNCTION_CACHE_MISS) {
    return "missing_function";
  }

  if (error.code === INVALID_TEXT_REPRESENTATION) {
    return "bad_id";
  }

  return "failed";
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message ?? null },
  };
}

const MISS = { data: null, error: { reason: "not_found", detail: null } };

/** Every camera and direction in one campaign. Empty for anybody but its
    Dungeon Master — the SELECT policies decide that. */
export async function listSceneStaging(supabase, campaignId) {
  const [cameras, directions] = await Promise.all([
    supabase
      .from("scene_cameras")
      .select(CAMERA_COLUMNS)
      .eq("campaign_id", campaignId),
    supabase
      .from("scene_directions")
      .select(DIRECTION_COLUMNS)
      .eq("campaign_id", campaignId),
  ]);

  if (cameras.error) {
    return failure(cameras.error);
  }

  if (directions.error) {
    return failure(directions.error);
  }

  return {
    data: { cameras: cameras.data ?? [], directions: directions.data ?? [] },
    error: null,
  };
}

export async function stageSceneCamera(
  supabase,
  { mapId, x, y, facing, note },
) {
  const { data, error } = await supabase.rpc("stage_scene_camera", {
    p_map_id: mapId,
    p_x: x,
    p_y: y,
    p_facing: facing,
    p_note: note ?? null,
  });

  if (error) {
    return failure(error);
  }

  return data ? { data: true, error: null } : MISS;
}

export async function removeSceneCamera(supabase, { mapId }) {
  const { data, error } = await supabase.rpc("remove_scene_camera", {
    p_map_id: mapId,
  });

  if (error) {
    return failure(error);
  }

  return data ? { data: true, error: null } : MISS;
}

/** An empty direction removes it. */
export async function directSceneToken(supabase, { tokenId, direction }) {
  const { data, error } = await supabase.rpc("direct_scene_token", {
    p_token_id: tokenId,
    p_direction: direction ?? "",
  });

  if (error) {
    return failure(error);
  }

  return data ? { data: true, error: null } : MISS;
}

/** `scene_busy` while this Dungeon Master already has one under way. */
export async function beginScenePainting(supabase, { campaignId }) {
  const { data, error } = await supabase.rpc("begin_scene_painting", {
    p_campaign_id: campaignId,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: true, error: null }
    : { data: null, error: { reason: "scene_busy", detail: null } };
}

export async function endScenePainting(supabase) {
  const { error } = await supabase.rpc("end_scene_painting");

  return error ? failure(error) : { data: true, error: null };
}

/** Answers the URLs of the scenes taken down to make room. */
export async function hangScene(supabase, { campaignId, id, name, url }) {
  const { data, error } = await supabase.rpc("hang_scene", {
    p_campaign_id: campaignId,
    p_id: id,
    p_name: name,
    p_url: url,
  });

  if (error) {
    return failure(error);
  }

  return Array.isArray(data)
    ? { data: { evicted: data.filter(Boolean) }, error: null }
    : MISS;
}

export async function uploadScene(supabase, { path, file }) {
  return uploadObject(supabase, {
    bucket: BUCKET,
    path,
    file,
    subject: SUBJECT,
  });
}

export async function removeScene(supabase, path) {
  return removeObject(supabase, { bucket: BUCKET, path, subject: SUBJECT });
}
