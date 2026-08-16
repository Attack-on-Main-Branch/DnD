"use server";

import { revalidatePath } from "next/cache";
import { insertCharacter, removeCharacter } from "sina/data/characters";
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
