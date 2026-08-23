"use server";

import { revalidatePath } from "next/cache";
import {
  clearCampaignMark,
  insertCampaignNote,
  placeCampaignMark,
} from "sina/data/campaigns";
import {
  insertCharacterNote,
  updateCharacterHealth,
  updateCharacterLevel,
} from "sina/data/characters";
import { parseMarkPoint } from "sina/rules/campaign";
import { MAX_NOTE_LENGTH, parseNote } from "sina/rules/character";
import { parseHitPoints } from "sina/rules/health";
import { parseLevel } from "sina/rules/level";

import { logFailure, logUncovered } from "@/lib/errors";
import { campaignTablePath, characterSheetPath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

function rejected(message) {
  return { kind: "rejected", message };
}

/**
 * No error means auth said no and signing in again fixes it; an error means it
 * could not answer, and a login form only repeats the failure.
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
const TABLE_COPY = {
  not_found: "That character is no longer yours to write for.",
  invalid_value: "That is outside what a character sheet can hold.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer yours to write for.",
};

/**
 * The board and the sheet both show what these change — a note written at the
 * table is read back under the character's Notes tab. A Dungeon Master's note
 * has no sheet to appear on, hence the guard.
 */
function revalidateBoth(campaignId, characterId) {
  revalidatePath(campaignTablePath(campaignId));

  if (characterId) {
    revalidatePath(characterSheetPath(characterId));
  }
}

export async function setCharacterHealth(campaignId, characterId, value) {
  const hitPoints = parseHitPoints(value);

  if (hitPoints === null) {
    return rejected("Hit points have to be a number.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("setCharacterHealth", authError);
  }

  // Who may write is the database's to decide: `set_character_health` answers
  // for the character's owner and for the Dungeon Master of the campaign it
  // names, and returns `not_found` — a deleted character's answer — to anybody
  // else.
  const { error } = await updateCharacterHealth(supabase, {
    id: characterId,
    hitPoints,
    campaignId,
  });

  if (error) {
    const copy = TABLE_COPY[error.reason];

    logUncovered("setCharacterHealth", error, copy);
    return rejected(copy ?? "Could not set that. Try again.");
  }

  revalidateBoth(campaignId, characterId);
  return { kind: "success", hitPoints };
}

/** A level is awarded, so a refusal is "not yours to give", not "that is gone". */
const LEVEL_COPY = {
  not_found: "That level is not yours to award.",
  invalid_value: "That is outside what a character sheet can hold.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer at this table.",
};

/**
 * One step of the ring on a party card. Bounded here for speed and by
 * `set_character_level` for real, which answers anybody who is not this
 * campaign's Dungeon Master with null.
 */
export async function setCharacterLevel(campaignId, characterId, value) {
  const level = parseLevel(value);

  if (level === null) {
    return rejected("A level has to be a number.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("setCharacterLevel", authError);
  }

  const { data, error } = await updateCharacterLevel(supabase, {
    id: characterId,
    level,
    campaignId,
  });

  if (error) {
    const copy = LEVEL_COPY[error.reason];

    logUncovered("setCharacterLevel", error, copy);
    return rejected(copy ?? "Could not set that. Try again.");
  }

  // The sheet prints it too.
  revalidateBoth(campaignId, characterId);
  return { kind: "success", level: data.level };
}

/**
 * One note, into whichever book the writer's seat owns. A `characterId` is a
 * player writing from their character; `null` is the Dungeon Master writing on
 * the campaign, the only note that belongs to no sheet. Which of those the
 * caller may do is the two tables' INSERT policies to decide, and a refusal
 * comes back as no row rather than as a failure.
 */
export async function writeTableNote(campaignId, characterId, value) {
  const body = parseNote(value);

  if (!body) {
    return rejected(`A note is 1 to ${MAX_NOTE_LENGTH} characters.`);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("writeTableNote", authError);
  }

  const { error } = characterId
    ? await insertCharacterNote(supabase, { characterId, body })
    : await insertCampaignNote(supabase, { campaignId, body });

  if (error) {
    const copy = TABLE_COPY[error.reason];

    logUncovered("writeTableNote", error, copy);
    return rejected(copy ?? "Could not write that down. Try again.");
  }

  revalidateBoth(campaignId, characterId);
  return { kind: "success" };
}

/**
 * A mark is refused rather than failed when the chair is not the caller's, so
 * `not_found` here is "that is not your seat" rather than "that is gone".
 */
const MARK_COPY = {
  not_found: "That is not yours to mark.",
  invalid_value: "That is not a place on the map.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That table is no longer there.",
};

/**
 * A token on the board, at a point given as fractions of the picture. A seat
 * has one mark, so this both places and moves it.
 *
 * `characterId` is the seat, not the account: `null` is the Dungeon Master's
 * chair. `place_campaign_mark` asks `my_seat_at_table` and writes nothing for
 * anybody else, so an account holding two chairs here cannot place the other
 * one's token by naming it.
 */
export async function placeTableMark(campaignId, characterId, point) {
  const spot = parseMarkPoint(point?.x, point?.y);

  if (!spot) {
    return rejected("That is not a place on the map.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("placeTableMark", authError);
  }

  const { error } = await placeCampaignMark(supabase, {
    campaignId,
    characterId,
    x: spot.x,
    y: spot.y,
  });

  if (error) {
    const copy = MARK_COPY[error.reason];

    logUncovered("placeTableMark", error, copy);
    return rejected(copy ?? "Could not mark the map. Try again.");
  }

  // No sheet to revalidate beside it: a mark belongs to the board alone.
  revalidatePath(campaignTablePath(campaignId));
  return { kind: "success" };
}

/** The token off again — your own, or any of them if you run this table. */
export async function clearTableMark(campaignId, characterId) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("clearTableMark", authError);
  }

  const { error } = await clearCampaignMark(supabase, {
    campaignId,
    characterId,
  });

  if (error) {
    const copy = MARK_COPY[error.reason];

    logUncovered("clearTableMark", error, copy);
    return rejected(copy ?? "Could not clear that mark. Try again.");
  }

  revalidatePath(campaignTablePath(campaignId));
  return { kind: "success" };
}
