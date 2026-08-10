"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

import {
  MAX_CHARACTERS,
  readCharacterValues,
  validateCharacter,
} from "./character-schema";

/** Postgres unique-violation SQLSTATE, raised by the name#tag index. */
const UNIQUE_VIOLATION = "23505";

function failure(message, field = null) {
  return { kind: "rejected", field, message };
}

/**
 * Creates a player character for the signed-in user.
 *
 * Shaped for `useActionState`: returns `{ kind: "error" }` rather than
 * throwing, so the panel can re-render with the message and keep what was
 * typed.
 */
export async function createPlayerCharacter(_prevState, formData) {
  const values = readCharacterValues(formData);

  // The browser checks this too, purely for speed. This is the copy that
  // counts — anything client-side can be bypassed.
  const invalid = validateCharacter(values);
  if (invalid) {
    return failure(invalid.message, invalid.field);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure("Your session has expired. Sign in again.");
  }

  const { error } = await supabase.from("characters").insert({
    user_id: user.id,
    kind: "player",
    name: values.name,
    discriminator: values.discriminator,
    race: values.race,
    alignment: values.alignment,
    backstory: values.backstory,
    personality: values.personality,
  });

  if (error) {
    return failure(...insertErrorMessage(error));
  }

  revalidatePath("/dashboard");
  return { kind: "success" };
}

/** @returns {[message: string, field: string | null]} */
function insertErrorMessage(error) {
  if (error.code === UNIQUE_VIOLATION) {
    return [
      "That name and tag are already taken. Try a different 4-digit tag.",
      "discriminator",
    ];
  }

  // Raised by the characters_enforce_limit trigger. The UI hides the button at
  // this point, so reaching here means the row count changed underneath us —
  // another tab, or a direct API call.
  if (error.message?.includes("character_limit_reached")) {
    return [`You already have ${MAX_CHARACTERS} characters.`, null];
  }

  // The table is missing until supabase/migrations/0001_characters.sql is run.
  if (error.code === "42P01") {
    return [
      "The characters table does not exist yet. Run supabase/migrations/0001_characters.sql in the Supabase SQL Editor.",
      null,
    ];
  }

  return [error.message || "Could not save the character. Please try again.", null];
}
