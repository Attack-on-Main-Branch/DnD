"use server";

import {
  deleteCharacterFeature,
  insertCharacterFeature,
} from "sina/data/features";
import { MAX_CHARACTER_FEATURES, validateFeature } from "sina/rules/features";

import { logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * Writing a feature down, and striking one out. Three surfaces call these — the
 * sheet's own tab, the Dungeon Master's Create tab, and the scores drawer at
 * the table — and none of them is a different rule, so there is one pair.
 *
 * NOTHING HERE REVALIDATES. The sheet holds its own list the way the notes
 * scroll does, and the table holds its own in table-state.jsx; both are handed
 * the row back and put it on screen without asking the route to render again.
 * The one exception is the campaign sheet's Create tab, which is a Server
 * Component list — it revalidates itself through `router.refresh()` rather than
 * from here, so this stays the same call for all three.
 *
 * WHO MAY WRITE ONE is the policies' question in 20260913090000: the owner, or
 * the Dungeon Master of a table this character plays at. A refusal comes back as
 * no row rather than as a failure, and reads the same as a character deleted
 * between the press and the call.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
const FEATURE_COPY = {
  limit_reached: `A character holds ${MAX_CHARACTER_FEATURES} features. Strike one out first.`,
  invalid_value: "That is outside what a feature can hold.",
  not_found: "That character is no longer yours to write for.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer there.",
};

export async function addCharacterFeature(characterId, { name, description }) {
  const { values, errors } = validateFeature({ name, description });

  if (errors) {
    return rejected(errors.name ?? errors.description);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("addCharacterFeature", authError);
  }

  const { data, error } = await insertCharacterFeature(supabase, {
    characterId,
    feature: values,
  });

  if (error) {
    const copy = FEATURE_COPY[error.reason];

    logUncovered("addCharacterFeature", error, copy);
    return rejected(copy ?? "Could not write that down. Try again.");
  }

  // The row itself: the card that goes up is drawn from it, and the id is what
  // a Remove presses against a moment later.
  return { kind: "success", feature: data };
}

export async function removeCharacterFeature(featureId, characterId) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("removeCharacterFeature", authError);
  }

  const { error } = await deleteCharacterFeature(supabase, {
    id: featureId,
    characterId,
  });

  if (error) {
    const copy = FEATURE_COPY[error.reason];

    logUncovered("removeCharacterFeature", error, copy);
    return rejected(copy ?? "Could not strike that out. Try again.");
  }

  return { kind: "success", featureId };
}
