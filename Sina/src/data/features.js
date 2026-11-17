/**
 * Every read and write against `character_features`. Failures come back as a
 * `reason` code, not a sentence.
 *
 * PLAIN SELECTS AND PLAIN WRITES, unlike most of this layer. Every column here
 * is one the writer may set and every column is one the table may read, so the
 * policies in 20260913090000 are the whole permission — there is nothing for a
 * definer function's return type to narrow, and no deed with a transaction
 * behind it.
 *
 * `character_id` is in the column list on purpose, unlike `user_id` elsewhere:
 * the Dungeon Master reads the whole party's features in one query and has to
 * know whose each row is.
 */

import { classifyDatabaseError } from "./database-errors.js";

const COLUMNS = "id, character_id, name, description, created_at";

function classify(error) {
  // Trigger-raised, so matched on the message: it has no SQLSTATE of its own.
  if (error.message?.includes("feature_limit_reached")) {
    return "limit_reached";
  }

  switch (error.code) {
    case "42703":
    case "42883":
    case "PGRST202":
      return "unknown";
  }

  return classifyDatabaseError(error);
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

/** Oldest first, so a card keeps its place in the grid as others are added. */
export async function listCharacterFeatures(supabase, characterId) {
  const { data, error } = await supabase
    .from("character_features")
    .select(COLUMNS)
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * The whole party's, in one round trip. RLS decides what comes back — and here
 * that is everybody's, because a feature is what a character can do and the
 * party finds that out the first time they do it.
 *
 * An empty party is answered without a query: PostgREST renders `in.()` as a
 * syntax error, and a campaign with nobody in it is the ordinary state of a new
 * one.
 */
export async function listPartyFeatures(supabase, characterIds) {
  if (!characterIds || characterIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("character_features")
    .select(COLUMNS)
    .in("character_id", characterIds)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * `.select()` makes the INSERT report the row, so an RLS refusal — no row
 * rather than a failure — is told apart from a write that landed. The row comes
 * back because the card is drawn from it: an id made here is what a Remove
 * presses against a moment later.
 */
export async function insertCharacterFeature(
  supabase,
  { characterId, feature },
) {
  const { data, error } = await supabase
    .from("character_features")
    .insert({
      character_id: characterId,
      name: feature.name,
      description: feature.description,
    })
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}

/**
 * Rewritten in place. The same two writers the insert has, and the same answer
 * — no row — for one the caller may not touch or that is already gone.
 */
export async function updateCharacterFeature(
  supabase,
  { id, characterId, feature },
) {
  const { data, error } = await supabase
    .from("character_features")
    .update({ name: feature.name, description: feature.description })
    .eq("id", id)
    .eq("character_id", characterId)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}

/**
 * One struck out. `character_id` rides along as a second lock on the same door,
 * the way every read in this layer carries one — and a row the caller may not
 * touch comes back as no row rather than as a failure, which is the same answer
 * a feature somebody else has already removed gives.
 */
export async function deleteCharacterFeature(supabase, { id, characterId }) {
  const { data, error } = await supabase
    .from("character_features")
    .delete()
    .eq("id", id)
    .eq("character_id", characterId)
    .select("id")
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}
