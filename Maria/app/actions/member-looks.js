"use server";

import { revalidatePath } from "next/cache";
import {
  clearMemberLook,
  readMemberLook,
  removeLookImage,
  saveMemberLook,
  uploadLookImage,
} from "sina/data/member-looks";
import {
  lookImageObjectPath,
  lookImagePathFromUrl,
  validateMemberLook,
} from "sina/rules/member-looks";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { campaignSheetPath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * How a party member looks, as the Dungeon Master describes them for the scene
 * painter. The picture goes up before the row points at it, and the old one
 * comes down only once nothing does.
 */

const NOT_STORED = "The picture could not be uploaded. Try again.";

const LOOK_COPY = {
  not_found: "That character is no longer in your party.",
  bad_id: "That character is no longer in your party.",
  invalid_value: "The database refused that description. Try a shorter one.",
  missing_table: "That part of the app is not ready yet.",
  missing_column: "That part of the app is not ready yet.",
  missing_bucket: NOT_STORED,
  look_denied: NOT_STORED,
  look_too_large: "Storage refused that picture for being too large.",
  look_exists: NOT_STORED,
  look_failed: NOT_STORED,
};

function refused(action, error, fallback) {
  const copy = LOOK_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

function missing(value) {
  return typeof value !== "string" || value.length === 0;
}

export async function describeMember(campaignId, characterId, formData) {
  if (missing(campaignId) || missing(characterId)) {
    return rejected("Missing character id.");
  }

  const { values, errors } = validateMemberLook({
    description: formData?.get("description"),
    image: formData?.get("image"),
  });

  if (errors) {
    return rejected(
      errors.description ?? errors.image,
      errors.description ? "description" : "image",
    );
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("describeMember", authError);
  }

  const standing = await readMemberLook(supabase, { campaignId, characterId });

  if (standing.error) {
    return refused(
      "describeMember/read",
      standing.error,
      "Could not save that.",
    );
  }

  // Undefined keeps the picture there; null takes it away.
  let imageUrl = formData.get("dropImage") === "1" ? null : undefined;

  if (values.image) {
    const upload = await uploadLookImage(supabase, {
      path: lookImageObjectPath({
        userId: user.id,
        campaignId,
        characterId,
        type: values.image.type,
        stamp: Date.now(),
      }),
      file: values.image,
    });

    if (upload.error) {
      return refused("describeMember/upload", upload.error, NOT_STORED);
    }

    imageUrl = upload.data.url;
  }

  const { error } = await saveMemberLook(supabase, {
    campaignId,
    characterId,
    imageUrl,
    description: values.description,
  });

  if (error) {
    if (imageUrl) {
      await sweep(supabase, imageUrl, "describeMember/rollback");
    }

    return refused("describeMember", error, "Could not save that.");
  }

  if (imageUrl !== undefined && standing.data?.image_url) {
    await sweep(supabase, standing.data.image_url, "describeMember/stale");
  }

  revalidatePath(campaignSheetPath(campaignId));

  return { kind: "success" };
}

export async function forgetMemberLook(campaignId, characterId) {
  if (missing(campaignId) || missing(characterId)) {
    return rejected("Missing character id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("forgetMemberLook", authError);
  }

  const { data, error } = await clearMemberLook(supabase, {
    campaignId,
    characterId,
  });

  if (error) {
    return refused("forgetMemberLook", error, "Could not clear that.");
  }

  await sweep(supabase, data.imageUrl, "forgetMemberLook/stale");

  revalidatePath(campaignSheetPath(campaignId));

  return { kind: "success" };
}

/** Best effort, and said out loud in the log if it did not work. */
async function sweep(supabase, url, where) {
  const path = lookImagePathFromUrl(url);

  if (!path) {
    return;
  }

  const cleanup = await removeLookImage(supabase, path);

  if (cleanup.error) {
    logFailure(where, cleanup.error);
  }
}
