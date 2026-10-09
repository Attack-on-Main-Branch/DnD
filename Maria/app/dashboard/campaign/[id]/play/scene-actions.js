"use server";

import {
  beginScenePainting,
  directSceneToken,
  endScenePainting,
  removeSceneCamera,
  stageSceneCamera,
} from "sina/data/scenes";
import { validateDirection, validateSceneCamera } from "sina/rules/scene";
import { vertexPainter } from "sina/services/vertex";
import { getVercelOidcToken } from "@vercel/oidc";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { paintSceneFor } from "@/lib/scene-painting";
import { createClient, getCurrentUser } from "@/lib/supabase";

const NOT_READY = "That part of the app is not ready yet.";
const NOT_STORED = "Could not keep the painting. Try again.";

const SCENE_COPY = {
  not_found: "That map is not yours to stage.",
  bad_id: "That map is no longer there.",
  invalid_value: "That is not a place on the map.",
  no_camera: "Put the camera on the board first.",
  scene_busy: "A scene is already being painted. Wait for it to finish.",
  map_unreadable: "The map could not be read. Try again.",
  scene_unreadable: "The painting came back unreadable. Try again.",
  painter_missing: "Scene painting is not set up on this server.",
  painter_key: "Scene painting is not set up correctly on this server.",
  painter_login: "The server's Google sign-in has expired.",
  painter_busy: "The painter is busy. Try again in a minute.",
  painter_rejected: "The painter could not take this request. Try again.",
  painter_refused:
    "The painter would not paint this one. Try changing what the creatures are doing.",
  painter_unavailable: "The painter did not answer. Try again.",
  missing_bucket: NOT_STORED,
  scene_denied: NOT_STORED,
  scene_exists: NOT_STORED,
  scene_too_large: NOT_STORED,
  scene_failed: NOT_STORED,
  missing_function: NOT_READY,
  missing_table: NOT_READY,
  missing_column: NOT_READY,
};

function refused(action, error, fallback) {
  const copy = SCENE_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

function missing(value) {
  return typeof value !== "string" || value.length === 0;
}

export async function stageCamera(mapId, camera) {
  if (missing(mapId)) {
    return rejected("Missing map id.");
  }

  const { values, errors } = validateSceneCamera(camera ?? {});

  if (errors) {
    return rejected(errors.note ?? errors.point);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("stageCamera", authError);
  }

  const { error } = await stageSceneCamera(supabase, { mapId, ...values });

  if (error) {
    return refused("stageCamera", error, "Could not move the camera.");
  }

  return { kind: "success", camera: { mapId, ...values } };
}

export async function removeCamera(mapId) {
  if (missing(mapId)) {
    return rejected("Missing map id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("removeCamera", authError);
  }

  const { error } = await removeSceneCamera(supabase, { mapId });

  if (error) {
    return refused("removeCamera", error, "Could not take the camera away.");
  }

  return { kind: "success" };
}

export async function directToken(tokenId, text) {
  if (missing(tokenId)) {
    return rejected("Missing piece id.");
  }

  const { value, error: invalid } = validateDirection(text);

  if (invalid) {
    return rejected(invalid);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("directToken", authError);
  }

  const { error } = await directSceneToken(supabase, {
    tokenId,
    direction: value,
  });

  if (error) {
    return refused("directToken", error, "Could not keep that direction.");
  }

  return { kind: "success", direction: value };
}

/** Takes as long as the painter does; the page's `maxDuration` allows for it. */
export async function paintScene(campaignId, mapId) {
  if (missing(campaignId) || missing(mapId)) {
    return rejected("Missing map id.");
  }

  // Only asked for when Vercel federation is the configured sign-in.
  const painter = await vertexPainter({
    subjectToken: () => getVercelOidcToken(),
  });

  if (!painter) {
    return rejected(SCENE_COPY.painter_missing);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("paintScene", authError);
  }

  const claim = await beginScenePainting(supabase, { campaignId });

  if (claim.error) {
    return refused("paintScene", claim.error, "Could not start the painting.");
  }

  try {
    const { data, error } = await paintSceneFor(supabase, {
      campaignId,
      mapId,
      userId: user.id,
      painter,
    });

    if (error) {
      // Logged whatever the copy: a painter failure is worth seeing in the logs.
      logFailure("paintScene", error);
      return rejected(SCENE_COPY[error.reason] ?? "Could not paint the scene.");
    }

    return { kind: "success", sceneId: data.id };
  } catch (thrown) {
    logFailure("paintScene", { reason: "thrown", detail: String(thrown) });
    return rejected("Could not paint the scene.");
  } finally {
    const done = await endScenePainting(supabase);

    if (done.error) {
      logFailure("paintScene/end", done.error);
    }
  }
}
