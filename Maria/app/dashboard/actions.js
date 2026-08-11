"use server";

import { revalidatePath } from "next/cache";
import {
  insertCharacter,
  removeCharacter,
} from "sina/data/characters";
import {
  MAX_CHARACTERS,
  readCharacterValues,
  validateCharacter,
} from "sina/rules/character";

import { createClient, getCurrentUser } from "@/lib/supabase";

function rejected(message, field = null) {
  return { kind: "rejected", field, message };
}

/** Sina reports why; the wording lives here, where the user can see it. */
const SAVE_COPY = {
  handle_taken: {
    message: "That name and tag are already taken. Try a different 4-digit tag.",
    field: "discriminator",
  },
  limit_reached: {
    message: `You already have ${MAX_CHARACTERS} characters.`,
    field: null,
  },
  missing_table: {
    message:
      "The characters table does not exist yet. Run the migrations in Sina/supabase/migrations.",
    field: null,
  },
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
  const user = await getCurrentUser(supabase);

  if (!user) {
    return rejected("Your session has expired. Sign in again.");
  }

  const { error } = await insertCharacter(supabase, { userId: user.id, values });

  if (error) {
    const copy = SAVE_COPY[error.reason];

    return rejected(
      copy?.message ??
        error.detail ??
        "Could not save the character. Please try again.",
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
  const user = await getCurrentUser(supabase);

  if (!user) {
    return rejected("Your session has expired. Sign in again.");
  }

  const { error } = await removeCharacter(supabase, {
    id: characterId,
    userId: user.id,
  });

  if (error) {
    return rejected(error.detail ?? "Could not delete the character.");
  }

  revalidatePath("/dashboard");
  return { kind: "success" };
}
