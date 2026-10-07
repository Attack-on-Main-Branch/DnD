"use server";

import { revalidatePath } from "next/cache";
import {
  listCampaignTokenTemplates,
  removeTokenImage,
  removeTokenTemplate,
  uploadTokenImage,
} from "sina/data/tokens";
import {
  listTokenHealth,
  writeTokenTemplate,
} from "sina/data/table-adjustments";
import { parseTokenMaxHp, MAX_TOKEN_HP } from "sina/rules/token-health";
import {
  MAX_CAMPAIGN_TOKENS,
  tokenImageObjectPath,
  tokenImagePathFromUrl,
  validateTokenTemplate,
} from "sina/rules/tokens";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { campaignSheetPath, campaignTablePath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The pieces a Dungeon Master invents, and strikes out again.
 *
 * Made on the campaign SHEET rather than at the table, for the reason the items
 * and the chests are: a form inside a popover had nowhere to keep what it made
 * between sessions, and a monster is drawn once and used all year.
 *
 * BOTH ROUTES ARE REVALIDATED. The sheet lists the pieces and the table's
 * palette deals them, and unlike everything else at that table this is not a
 * live board deed — the page it changes is the one the Dungeon Master is
 * standing on.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
const TOKEN_COPY = {
  limit_reached: `A campaign keeps ${MAX_CAMPAIGN_TOKENS} pieces. Remove one first.`,
  invalid_value: "The database refused that name. Try a shorter one.",
  not_found: "That campaign is no longer yours.",
  already_placed: "That piece already exists. Try again.",
  missing_bucket:
    "The campaign-maps storage bucket does not exist yet. Run the migrations in Sina/supabase/migrations.",
  missing_table:
    "The campaign_token_templates table does not exist yet. Run the migrations in Sina/supabase/migrations.",
  missing_function: "That part of the app is not ready yet.",
  not_ready: "That part of the app is not ready yet.",
  missing_column: "That part of the app is not ready yet.",
  token_denied: "The picture could not be uploaded: storage refused it.",
  token_too_large: "Storage refused that picture for being too large.",
  token_exists: "A picture is already stored under that name. Try again.",
  token_failed: "The picture could not be uploaded. Try again in a moment.",
  bad_id: "That campaign is no longer there.",
};

function refused(action, error, fallback) {
  const copy = TOKEN_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/** The sheet lists the pieces and the table's palette deals them. */
function revalidateBoth(campaignId) {
  revalidatePath(campaignSheetPath(campaignId));
  revalidatePath(campaignTablePath(campaignId));
}

/**
 * A piece invented: a picture and a name.
 *
 * THE PICTURE GOES UP BEFORE THE ROW POINTS AT IT, and comes back down if the
 * row is refused — the same order, and the same reason, as a map on the shelf:
 * a refused write must leave no card naming nothing, and the object is litter
 * the moment no row can find it.
 *
 * The file arrives inside the Server Action's body, already re-encoded to WebP
 * by the browser — see token-form.jsx and lib/image-compression.js.
 */
export async function writeCampaignToken(campaignId, formData) {
  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return rejected("Missing campaign id.");
  }

  const image = formData.get("image");
  const maxHp = parseTokenMaxHp(formData.get("maxHp"));
  if (maxHp === undefined)
    return rejected(
      `HP must be a whole number from 1 to ${MAX_TOKEN_HP}.`,
      "maxHp",
    );
  const { values, errors } = validateTokenTemplate({
    name: formData.get("name"),
    image,
  });

  if (errors) {
    return rejected(
      errors.name ?? errors.image,
      errors.name ? "name" : "image",
    );
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("writeCampaignToken", authError);
  }

  /* The id is made here because the object in storage is named after it, and
     the object has to exist first. */
  const id = crypto.randomUUID();

  const upload = await uploadTokenImage(supabase, {
    path: tokenImageObjectPath({
      userId: user.id,
      campaignId,
      templateId: id,
      type: image.type,
    }),
    file: image,
  });

  if (upload.error) {
    return refused(
      "writeCampaignToken/upload",
      upload.error,
      "The picture could not be uploaded. Try again.",
    );
  }

  const { data, error } = await writeTokenTemplate(supabase, {
    id,
    campaignId,
    name: values.name,
    imageUrl: upload.data.url,
    maxHp,
  });

  if (error) {
    // The row is what makes the object findable; without it, it is litter.
    await sweep(supabase, upload.data.url, "writeCampaignToken/rollback");

    return refused("writeCampaignToken", error, "Could not make that piece.");
  }

  revalidateBoth(campaignId);

  return { kind: "success", token: data };
}

/**
 * A piece renamed, and redrawn if a new picture came with it.
 *
 * A new picture goes up under a name of its own before the row is pointed at
 * it — the old object is never overwritten, so a refused update leaves the
 * piece exactly as it was. The old picture is swept only once nothing points
 * at it; the new one, if the row refused it.
 */
export async function editCampaignToken(campaignId, id, formData) {
  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return rejected("Missing campaign id.");
  }

  const image = formData.get("image");
  const maxHp = parseTokenMaxHp(formData.get("maxHp"));
  if (maxHp === undefined)
    return rejected(
      `HP must be a whole number from 1 to ${MAX_TOKEN_HP}.`,
      "maxHp",
    );
  const { values, errors } = validateTokenTemplate(
    { name: formData.get("name"), image },
    { requireImage: false },
  );

  if (errors) {
    return rejected(
      errors.name ?? errors.image,
      errors.name ? "name" : "image",
    );
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("editCampaignToken", authError);
  }

  const { data: hand, error: readError } = await listCampaignTokenTemplates(
    supabase,
    campaignId,
  );

  if (readError) {
    return refused("editCampaignToken/read", readError, "Could not save that.");
  }

  const standing = hand.find((one) => one.id === id);

  if (!standing) {
    return rejected("That piece is no longer in your hand.");
  }

  const redrawn = image && typeof image === "object" && image.size > 0;
  let imageUrl = null;

  if (redrawn) {
    const upload = await uploadTokenImage(supabase, {
      path: tokenImageObjectPath({
        userId: user.id,
        campaignId,
        templateId: crypto.randomUUID(),
        type: image.type,
      }),
      file: image,
    });

    if (upload.error) {
      return refused(
        "editCampaignToken/upload",
        upload.error,
        "The picture could not be uploaded. Try again.",
      );
    }

    imageUrl = upload.data.url;
  }

  const { data, error } = await writeTokenTemplate(supabase, {
    id,
    campaignId,
    name: values.name,
    imageUrl,
    maxHp,
    editing: true,
  });

  if (error) {
    if (imageUrl) {
      await sweep(supabase, imageUrl, "editCampaignToken/rollback");
    }

    return error.reason === "not_found"
      ? rejected("That piece is no longer in your hand.")
      : refused("editCampaignToken", error, "Could not save that piece.");
  }

  if (imageUrl) {
    await sweep(supabase, standing.image_url, "editCampaignToken/stale");
  }

  revalidateBoth(campaignId);

  return { kind: "success", token: data };
}

/**
 * One struck out, and every copy of it standing on a board with it —
 * `map_placed_tokens` cascades on `template_id`.
 *
 * The picture goes after the row, which is the other order and the same rule:
 * nothing may point at an object that is not there.
 */
export async function strikeCampaignToken(campaignId, id) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("strikeCampaignToken", authError);
  }

  const { data, error } = await removeTokenTemplate(supabase, {
    id,
    campaignId,
  });

  if (error) {
    return refused("strikeCampaignToken", error, "Could not remove that.");
  }

  await sweep(supabase, data.imageUrl, "strikeCampaignToken/stale");

  revalidateBoth(campaignId);

  return { kind: "success" };
}

/**
 * The hand as it stands, for a form that has just changed it. Read back rather
 * than worked out in the browser: the trigger is what decides whether a fifth
 * piece was allowed, and only the database knows what two tabs did.
 */
export async function readCampaignTokens(campaignId) {
  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);

  if (!user) {
    return null;
  }

  const { data, error } = await listCampaignTokenTemplates(
    supabase,
    campaignId,
  );

  if (error) {
    logFailure("readCampaignTokens", error);
    return null;
  }

  const health = await listTokenHealth(supabase, campaignId, true);
  if (health.error) {
    logFailure("readCampaignTokens/health", health.error);
    return null;
  }
  return data.map((token) => ({
    ...token,
    max_hp:
      health.data.find((row) => row.template_id === token.id)?.max_hp ?? null,
  }));
}

/** Best effort, and said out loud in the log if it did not work. */
async function sweep(supabase, url, where) {
  const path = tokenImagePathFromUrl(url);

  if (!path) {
    return;
  }

  const cleanup = await removeTokenImage(supabase, path);

  if (cleanup.error) {
    logFailure(where, cleanup.error);
  }
}
