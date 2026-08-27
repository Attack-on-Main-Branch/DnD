"use server";

import { revalidatePath } from "next/cache";
import {
  toggleCondition as toggleCharacterCondition,
  togglePartyCondition,
  updateCharacter as writeCharacter,
} from "sina/data/characters";
import { ALL_PARTY, isCondition } from "sina/rules/conditions";
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

/**
 * One of the fifteen conditions, on or off.
 *
 * `ALL_PARTY` in place of a character is the head of the table announcing it for
 * everybody, and it is a different function in the database rather than this one
 * run six times: a per-character toggle across a party half of whom already have
 * it would leave them split down the middle on one press. `toggle_party_condition`
 * reads the set first and chooses one direction for all of them.
 *
 * THE CAMPAIGN AND THE CHAIR RIDE ALONG as trailing arguments with defaults, the
 * way every deed at a card takes them: a character sits at more than one table,
 * so "may the Dungeon Master do this" is never a question about a character
 * alone, and `arm_table_log` needs both to leave a line.
 *
 * Nothing is revalidated. The badges are held in table-state.jsx and the press
 * has already painted them.
 */
const CONDITION_COPY = {
  not_found: "That is not yours to change at this table.",
  invalid_value: "That is not a condition.",
  bad_id: "That character is no longer at this table.",
};

export async function toggleCondition(
  characterId,
  conditionKey,
  campaignId = null,
  seatCharacterId = null,
  partyIds = null,
) {
  if (!isCondition(conditionKey)) {
    return rejected("That is not a condition.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("toggleCondition", authError);
  }

  const { data, error } =
    characterId === ALL_PARTY
      ? await togglePartyCondition(supabase, {
          campaignId,
          key: conditionKey,
          /* Whoever the panel's menu is aimed at, narrowed again against
             `campaign_members` inside the function: an id from a browser says
             who is REACHED and never who may be. */
          characterIds: partyIds,
          seatCharacterId,
        })
      : await toggleCharacterCondition(supabase, {
          id: characterId,
          key: conditionKey,
          campaignId,
          seatCharacterId,
        });

  if (error) {
    const copy = CONDITION_COPY[error.reason];

    logUncovered("toggleCondition", error, copy);
    return rejected(copy ?? "Could not change that. Try again.");
  }

  /* NO ACTIVITY COMES BACK. A condition leaves no line — see 20260915090000 —
     and a round of combat is a dozen of these presses; a ten-entry log one turn
     can fill is a log that has stopped being one. */
  return {
    kind: "success",
    applied: data.applied,
    condition: conditionKey,
    characterIds: data.characterIds,
    conditions: data.conditions ?? null,
  };
}
