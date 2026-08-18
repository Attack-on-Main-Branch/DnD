"use server";

import { revalidatePath } from "next/cache";
import {
  addPartyMember,
  searchCharacters,
  insertCampaign,
  removeCampaign,
  removeCampaignMap,
  removePartyMember,
  uploadCampaignMap,
} from "sina/data/campaigns";
import { insertCharacter, removeCharacter } from "sina/data/characters";
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
  MAX_CHARACTERS,
  readCharacterValues,
  validateCharacter,
} from "sina/rules/character";

import { logFailure, logUncovered } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

function rejected(message, field = null) {
  return { kind: "rejected", field, message };
}

/**
 * The two reasons `getCurrentUser` hands back no user, told apart. No error
 * means auth said no and signing in again fixes it; an error means auth could
 * not answer, and sending that user to a login form only repeats the failure.
 */
function sessionRejection(action, error) {
  if (!error) {
    return rejected("Your session has expired. Sign in again.");
  }

  logFailure(`${action}/auth`, error);
  return rejected(
    "Could not reach the sign-in service. Try again in a moment.",
  );
}

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
};

/**
 * `not_found` covers two things and the copy has to work for both: the row was
 * removed elsewhere, or it was never this caller's to remove. RLS makes those
 * indistinguishable here on purpose — saying "not yours" would confirm the
 * character exists to someone with no business knowing, which is the same
 * reason the character route answers 404 rather than 403.
 */
const DELETE_COPY = {
  not_found: "That character is no longer in your roster.",
};

/**
 * Creates a player character for the signed-in user.
 *
 * Shaped for `useActionState`: returns `{ kind: "rejected" }` rather than
 * throwing, so the panel can re-render with the message and keep what was
 * typed.
 */
export async function createPlayerCharacter(_prevState, formData) {
  const values = readCharacterValues(formData);

  // The browser checks this too, purely for speed. This is the copy that
  // counts — anything client-side can be bypassed.
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
 * Creates a campaign for the signed-in user, with its map if one was chosen.
 *
 * The map is uploaded from here rather than from the browser, and that is a
 * consequence of an earlier decision rather than a preference: session cookies
 * are `httpOnly`, so a browser Supabase client cannot read them and would reach
 * storage unauthenticated — silently, arriving as an RLS refusal. The file
 * therefore travels in the form body, which is why `serverActions.bodySizeLimit`
 * is raised in next.config.mjs. It is small by then; the browser has already
 * re-encoded it.
 *
 * The id is generated here rather than by the database, because the object is
 * named after the campaign and so the name has to exist first. Upload, insert,
 * then remove the object if the insert failed — the other order would need an
 * UPDATE policy on a table nothing edits yet.
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
    // The row is what makes the object findable. Without it the upload is
    // litter, so it goes before the failure is reported.
    if (mapPath) {
      await removeCampaignMap(supabase, mapPath);
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
 * Deletes one of the caller's campaigns, and its map with it.
 *
 * The object goes after the row, not before: if the delete is refused there is
 * nothing to undo, whereas removing the file first would leave a campaign
 * pointing at a URL that answers 404. The cleanup itself is best-effort — an
 * orphaned object is untidy, a failed deletion the user was told succeeded is
 * worse.
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

    // Same trade as deleteCharacter: the roster is revalidated even on
    // `not_found`, because the card on screen is stale either way, and the
    // campaign quietly disappearing is the right answer.
    if (error.reason === "not_found") {
      revalidatePath("/dashboard");
    }

    return rejected(copy ?? "Could not delete the campaign.");
  }

  const path = mapPathFromUrl(data.mapUrl);

  if (path) {
    await removeCampaignMap(supabase, path);
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

    // A `not_found` delete still revalidates: the row is gone, so the card on
    // screen is stale, and re-rendering the roster is what clears it. Returning
    // without it leaves a card whose Retire button only repeats this message.
    //
    // The trade is that the roster comes back in the same response as the
    // rejection, so the card unmounts before it can paint DELETE_COPY.not_found
    // — the character silently vanishing IS the answer here, which is the right
    // one. The message is still returned rather than dropped: it keeps this
    // action's contract honest for any other caller, and keeps the reason
    // covered so logUncovered stays quiet.
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
  not_found: "That character no longer exists.",
  missing_table:
    "The party table does not exist yet. Run the migrations in Sina/supabase/migrations.",
  missing_function:
    "The character lookup is missing. Run the migrations in Sina/supabase/migrations.",
};

/**
 * Looks up a character by the handle a player hands out, for the DM to confirm
 * before adding.
 *
 * A search rather than an add, deliberately: two characters can differ only in
 * their four digits and belong to different people, so the DM gets to see who
 * they found before anybody joins anything.
 *
 * Requires a session but not a campaign — the lookup is by exact handle and
 * returns display fields only, so there is nothing here to scope to one
 * campaign that the function itself does not already bound.
 */
export async function findPartyCandidate(_prevState, formData) {
  // Echoed back on every outcome, so the box still holds what was typed after
  // the round trip. A search field that empties itself makes correcting a typo
  // mean retyping the whole thing.
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

  return { kind: "success", query, results: data };
}

/** Adds a character the DM has already found to one of their campaigns. */
export async function addCharacterToParty(campaignId, characterId) {
  if (typeof campaignId !== "string" || typeof characterId !== "string") {
    return rejected("Missing campaign or character id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("addCharacterToParty", authError);
  }

  // The insert policy checks the campaign against the caller, so a campaign
  // that is not theirs is refused by the database rather than by a check here
  // that a direct API call could walk past.
  const { error } = await addPartyMember(supabase, { campaignId, characterId });

  if (error) {
    const copy = PARTY_COPY[error.reason];
    logUncovered("addCharacterToParty", error, copy);

    return rejected(copy ?? "Could not add that character to the party.");
  }

  revalidatePath(`/dashboard/campaign/${campaignId}`);
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
    const copy = PARTY_COPY[error.reason];
    logUncovered("removeCharacterFromParty", error, copy);

    // Already gone is the outcome the click wanted; refreshing the page is what
    // makes that true on screen.
    if (error.reason === "not_found") {
      revalidatePath(`/dashboard/campaign/${campaignId}`);
    }

    return rejected(copy ?? "Could not remove that character.");
  }

  revalidatePath(`/dashboard/campaign/${campaignId}`);
  return { kind: "success" };
}
