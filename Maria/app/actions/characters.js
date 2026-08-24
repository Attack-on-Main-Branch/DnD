"use server";

import { revalidatePath } from "next/cache";
import { updateCharacter as writeCharacter } from "sina/data/characters";
import { readCharacterValues, validateCharacter } from "sina/rules/character";

import { logUncovered } from "@/lib/errors";
import { characterSheetPath } from "@/lib/routes";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/** Sina reports why; the wording lives here, where the user can see it. */
const EDIT_COPY = {
  handle_taken: {
    message:
      "That name and tag are already taken. Try a different 4-digit tag.",
    field: "discriminator",
  },
  /*
   * Removed elsewhere, or never this caller's. RLS makes the two
   * indistinguishable on purpose — the same reasoning the delete path
   * documents, and the reason `update_character` answers `false` to both.
   */
  not_found: {
    message: "That character is no longer in your roster.",
    field: null,
  },
  bad_id: { message: "That character could not be found.", field: null },
  invalid_value: {
    message:
      "The database refused one of those values. Try shortening the name or the written sections.",
    field: null,
  },
  missing_function: {
    message:
      "The character editor is missing. Run the migrations in Sina/supabase/migrations.",
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
 * The sheet as its owner rewrote it.
 *
 * The id is a bound argument rather than a form field: a hidden input is the
 * caller's to set, and this is the one value they must not choose.
 * `update_character` checks it against the session regardless, so this is
 * defence in depth rather than the guard itself.
 *
 * Returns `{ kind: "rejected" }` rather than throwing, like every other form
 * action, so the sheet re-renders with the message and keeps what was typed.
 */
export async function updateCharacter(characterId, formData) {
  if (typeof characterId !== "string" || characterId.length === 0) {
    return rejected("Missing character id.");
  }

  const values = readCharacterValues(formData);

  // The browser checks this too, for speed. This is the run that counts.
  const malformed = validateCharacter(values);

  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("updateCharacter", authError);
  }

  const { error } = await writeCharacter(supabase, {
    id: characterId,
    values,
  });

  if (error) {
    const copy = EDIT_COPY[error.reason];
    logUncovered("updateCharacter", error, copy);

    return rejected(
      copy?.message ?? "Could not save the changes. Please try again.",
      copy?.field ?? null,
    );
  }

  // The sheet the edit was made on, and the roster tile that repeats it.
  revalidatePath(characterSheetPath(characterId));
  revalidatePath("/dashboard");

  return { kind: "success" };
}
