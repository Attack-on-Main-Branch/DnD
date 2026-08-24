"use server";

import { revalidatePath } from "next/cache";
import {
  searchCharacters,
  insertCampaign,
  removeCampaign,
  removeCampaignMap,
  removePartyMember,
  uploadCampaignMap,
} from "sina/data/campaigns";
import { insertCharacter, removeCharacter } from "sina/data/characters";
import { sendCampaignInvite } from "sina/data/notifications";
import {
  mapObjectPath,
  mapPathFromUrl,
  MAX_CAMPAIGNS,
  MAX_PARTY,
  parseCharacterQuery,
  readCampaignValues,
  validateCampaign,
} from "sina/rules/campaign";
import {
  classLabel,
  MAX_CHARACTERS,
  readCharacterValues,
  validateCharacter,
} from "sina/rules/character";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/** Sina reports why; the wording lives here, where the user can see it. */
const SAVE_COPY = {
  handle_taken: {
    message:
      "That name and tag are already taken. Try a different 4-digit tag.",
    field: "discriminator",
  },
  limit_reached: {
    message: `You already have ${MAX_CHARACTERS} characters.`,
    field: null,
  },
  invalid_value: {
    message:
      "The database refused one of those values. Try shortening the name or the written sections.",
    field: null,
  },
  missing_table: {
    message:
      "The characters table does not exist yet. Run the migrations in Sina/supabase/migrations.",
    field: null,
  },
  missing_column: {
    message:
      "The characters table is missing a column this needs. Run the migrations in Sina/supabase/migrations.",
    field: null,
  },
};

/**
 * `not_found` means removed elsewhere or never this caller's, and RLS makes
 * them indistinguishable on purpose: "not yours" confirms the character exists
 * to someone with no business knowing. Same reason the route 404s, not 403s.
 */
const DELETE_COPY = {
  not_found: "That character is no longer in your roster.",
  // A uuid column refuses a malformed id before it looks at a row, so a
  // hand-built request lands here rather than on a miss.
  bad_id: "That character could not be found.",
};

/**
 * Shaped for `useActionState`: returns `{ kind: "rejected" }` rather than
 * throwing, so the panel re-renders with the message and keeps what was typed.
 */
export async function createPlayerCharacter(_prevState, formData) {
  const values = readCharacterValues(formData);

  // The browser checks this too, for speed. This is the run that counts.
  const malformed = validateCharacter(values);
  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("createPlayerCharacter", authError);
  }

  const { error } = await insertCharacter(supabase, {
    userId: user.id,
    values,
  });

  if (error) {
    const copy = SAVE_COPY[error.reason];
    logUncovered("createPlayerCharacter", error, copy);

    return rejected(
      copy?.message ?? "Could not save the character. Please try again.",
      copy?.field ?? null,
    );
  }

  revalidatePath("/dashboard");
  return { kind: "success" };
}

/** The storage half has its own reasons, and its own things to go and fix. */
const CAMPAIGN_COPY = {
  limit_reached: {
    message: `You already have ${MAX_CAMPAIGNS} campaigns.`,
    field: null,
  },
  invalid_value: {
    message:
      "The database refused one of those values. Try shortening the title or the description.",
    field: null,
  },
  missing_table: {
    message:
      "The campaigns table does not exist yet. Run the migrations in Sina/supabase/migrations.",
    field: null,
  },
  missing_column: {
    message:
      "The campaigns table is missing a column this needs. Run the migrations in Sina/supabase/migrations.",
    field: null,
  },
  missing_bucket: {
    message:
      "The campaign-maps storage bucket does not exist yet. Run the migrations in Sina/supabase/migrations.",
    field: "map",
  },
  map_denied: {
    message: "The map could not be uploaded: storage refused the request.",
    field: "map",
  },
  map_too_large: {
    message: "Storage refused the map for being too large.",
    field: "map",
  },
  map_exists: {
    message: "A map is already stored under that name. Try again.",
    field: "map",
  },
  map_failed: {
    message: "The map could not be uploaded. Try again in a moment.",
    field: "map",
  },
};

/**
 * The map uploads from here, not the browser: session cookies are `httpOnly`,
 * so a browser Supabase client would reach storage unauthenticated and arrive
 * as a silent RLS refusal. The file therefore travels in the form body, which
 * is why `serverActions.bodySizeLimit` is raised in next.config.mjs.
 *
 * The id is generated here because the object is named after the campaign, so
 * the name must exist first: upload, insert, then remove the object if the
 * insert failed. The other order would need an UPDATE policy.
 */
export async function createCampaign(_prevState, formData) {
  const values = readCampaignValues(formData);

  const malformed = validateCampaign(values);
  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("createCampaign", authError);
  }

  const id = crypto.randomUUID();
  let mapUrl = null;
  let mapPath = null;

  if (values.map) {
    mapPath = mapObjectPath({
      userId: user.id,
      campaignId: id,
      type: values.map.type,
    });

    const upload = await uploadCampaignMap(supabase, {
      path: mapPath,
      file: values.map,
    });

    if (upload.error) {
      const copy = CAMPAIGN_COPY[upload.error.reason];
      logUncovered("createCampaign/map", upload.error, copy);

      return rejected(
        copy?.message ?? "The map could not be uploaded. Try again.",
        copy?.field ?? "map",
      );
    }

    mapUrl = upload.data.url;
  }

  const { error } = await insertCampaign(supabase, {
    id,
    userId: user.id,
    values,
    mapUrl,
  });

  if (error) {
    // The row is what makes the object findable; without it, it is litter.
    if (mapPath) {
      const cleanup = await removeCampaignMap(supabase, mapPath);

      if (cleanup.error) {
        logFailure("createCampaign/rollback", cleanup.error);
      }
    }

    const copy = CAMPAIGN_COPY[error.reason];
    logUncovered("createCampaign", error, copy);

    return rejected(
      copy?.message ?? "Could not save the campaign. Please try again.",
      copy?.field ?? null,
    );
  }

  revalidatePath("/dashboard");
  return { kind: "success" };
}

/**
 * The object goes after the row: removing the file first would leave a campaign
 * pointing at a URL that answers 404 if the delete were then refused.
 */
export async function deleteCampaign(campaignId) {
  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return rejected("Missing campaign id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("deleteCampaign", authError);
  }

  const { data, error } = await removeCampaign(supabase, {
    id: campaignId,
    userId: user.id,
  });

  if (error) {
    const copy = CAMPAIGN_DELETE_COPY[error.reason];
    logUncovered("deleteCampaign", error, copy);

    // Revalidated even on `not_found`: the card on screen is stale either way.
    if (error.reason === "not_found") {
      revalidatePath("/dashboard");
    }

    return rejected(copy ?? "Could not delete the campaign.");
  }

  const path = mapPathFromUrl(data.mapUrl);

  if (path) {
    // Logged, not reported: the campaign is gone either way, and an orphaned
    // object is an operator's problem rather than the user's.
    const cleanup = await removeCampaignMap(supabase, path);

    if (cleanup.error) {
      logFailure("deleteCampaign/map", cleanup.error);
    }
  }

  revalidatePath("/dashboard");
  return { kind: "success" };
}

/**
 * `not_found` covers both "already gone" and "never yours", and RLS makes them
 * indistinguishable here on purpose — the same reasoning as DELETE_COPY above.
 */
const CAMPAIGN_DELETE_COPY = {
  not_found: "That campaign is no longer in your list.",
  bad_id: "That campaign could not be found.",
};

/** Deletes one of the caller's characters. */
export async function deleteCharacter(characterId) {
  if (typeof characterId !== "string" || characterId.length === 0) {
    return rejected("Missing character id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("deleteCharacter", authError);
  }

  const { error } = await removeCharacter(supabase, {
    id: characterId,
    userId: user.id,
  });

  if (error) {
    const copy = DELETE_COPY[error.reason];
    logUncovered("deleteCharacter", error, copy);

    // Revalidated on `not_found` too: the row is gone, so the card is stale and
    // re-rendering is what clears it. The card unmounts before it can paint the
    // message, which is the right answer; the message is still returned to keep
    // the reason covered and logUncovered quiet.
    if (error.reason === "not_found") {
      revalidatePath("/dashboard");
    }

    return rejected(copy ?? "Could not delete the character.");
  }

  revalidatePath("/dashboard");
  return { kind: "success" };
}

/** The party's own reasons, told apart from the campaign's. */
const PARTY_COPY = {
  party_full: `That party is full at ${MAX_PARTY} characters.`,
  already_added: "That character is already in this party.",
  invite_pending:
    "That player has already been asked, and has not replied yet.",
  character_not_found: "That character no longer exists.",
  campaign_not_found: "That campaign is no longer yours.",
  not_found: "That character no longer exists.",
  missing_table:
    "The party table does not exist yet. Run the migrations in Sina/supabase/migrations.",
  missing_function:
    "The character lookup is missing. Run the migrations in Sina/supabase/migrations.",
  // Neutral: an invitation carries two ids, so either could be the malformed one.
  bad_id: "That campaign or character could not be found.",
};

/**
 * A search rather than a direct add: two characters can differ only in their
 * four digits and belong to different people, so the DM confirms who they found
 * first. Requires a session but not a campaign — the RPC returns display fields
 * only and bounds itself.
 */
export async function findPartyCandidate(_prevState, formData) {
  // Echoed back on every outcome, so a typo does not mean retyping.
  const query = String(formData.get("query") ?? "");
  const parsed = parseCharacterQuery(query);

  if (!parsed) {
    return {
      ...rejected("Search by name or id.", "query"),
      query,
    };
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return { ...sessionRejection("findPartyCandidate", authError), query };
  }

  const { data, error } = await searchCharacters(supabase, parsed);

  if (error) {
    const copy = PARTY_COPY[error.reason];
    logUncovered("findPartyCandidate", error, copy);

    return {
      ...rejected(copy ?? "Could not search for characters.", "query"),
      query,
    };
  }

  // Labelled here for the same reason the roster is: PartyPanel renders both
  // lists, and neither should drag the class catalogue into the browser.
  return {
    kind: "success",
    query,
    results: data.map((character) => ({
      ...character,
      pathLabel: classLabel(character.class_id),
    })),
  };
}

/**
 * Asks a character's player to join one of the DM's campaigns.
 *
 * This used to write the membership row outright, which meant anybody who could
 * be found by a handle could be enlisted without ever being asked. The row is
 * now written by the player, when they accept — see `acceptCampaignInvite` in
 * app/actions/notifications.js and the migration behind it.
 *
 * The campaign is checked against the caller inside the definer function rather
 * than here, for the same reason the insert policy did it: a check up here
 * could be walked past by calling the RPC directly.
 */
export async function inviteCharacterToParty(campaignId, characterId) {
  if (typeof campaignId !== "string" || typeof characterId !== "string") {
    return rejected("Missing campaign or character id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("inviteCharacterToParty", authError);
  }

  const { error } = await sendCampaignInvite(supabase, {
    campaignId,
    characterId,
  });

  if (error) {
    const copy = PARTY_COPY[error.reason];
    logUncovered("inviteCharacterToParty", error, copy);

    // Both of these mean the roster on screen no longer matches the table.
    if (error.reason === "already_added" || error.reason === "party_full") {
      revalidatePath(`/dashboard/campaign/${campaignId}`);
    }

    return rejected(copy ?? "Could not send that invitation.");
  }

  return { kind: "success" };
}

export async function removeCharacterFromParty(campaignId, characterId) {
  if (typeof campaignId !== "string" || typeof characterId !== "string") {
    return rejected("Missing campaign or character id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("removeCharacterFromParty", authError);
  }

  const { error } = await removePartyMember(supabase, {
    campaignId,
    characterId,
  });

  if (error) {
    // Already gone is the outcome the click wanted, so it is a success with
    // nothing left to do. Ahead of logUncovered, or a benign no-op logs an
    // error and shows a banner beside the row it just removed.
    if (error.reason === "not_found") {
      revalidatePath(`/dashboard/campaign/${campaignId}`);
      return { kind: "success" };
    }

    const copy = PARTY_COPY[error.reason];
    logUncovered("removeCharacterFromParty", error, copy);

    return rejected(copy ?? "Could not remove that character.");
  }

  revalidatePath(`/dashboard/campaign/${campaignId}`);
  return { kind: "success" };
}
