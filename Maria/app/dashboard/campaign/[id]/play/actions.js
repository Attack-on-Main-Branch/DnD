"use server";

import { listCampaignActivity } from "sina/data/activity";
import {
  clearCampaignMark,
  insertCampaignNote,
  listCampaignNotes,
  placeCampaignMark,
} from "sina/data/campaigns";
import {
  insertCharacterNote,
  listCharacterNotes,
  updateCharacterHealth,
} from "sina/data/characters";
import { moveCharacterInspiration } from "sina/data/inspiration";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";
import { parseMarkPoint } from "sina/rules/campaign";
import { MAX_NOTE_LENGTH, parseNote } from "sina/rules/character";
import { MAX_HP } from "sina/rules/health";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The board's own writes: hit points, inspiration, notes and the tokens on the
 * map. A LEVEL IS NOT AMONG THEM ANY MORE — since 20260906 the ring is a
 * read-out, and the only thing that moves it is experience crossing a threshold
 * inside `modify_character_xp`. See session-actions.js.
 *
 * NOTHING HERE CALLS `revalidatePath`. Revalidating the page the caller is
 * standing on makes the response carry a re-rendered tree for it — `loadTable`'s
 * nine or ten queries and a render of the whole board, for a press that moved
 * one integer. The numbers are held in table-state.jsx instead. The character
 * sheet's path is not revalidated either and does not need to be: it is a
 * dynamic route, so `staleTimes.dynamic` is zero and a navigation refetches.
 *
 * The log entry these leave behind is written by the DATABASE, in the same
 * transaction as the deed — see 20260830090000 — so each of the two below reads
 * the fresh list back in the same request.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
const TABLE_COPY = {
  not_found: "That character is no longer yours to write for.",
  invalid_value: "That is outside what a character sheet can hold.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer yours to write for.",
};

/**
 * The log after the write that has just landed. Absent rather than failed when
 * it cannot be read: a panel one beat behind is not worth refusing a deed for.
 */
async function freshLog(supabase, campaignId) {
  const { data, error } = await listCampaignActivity(
    supabase,
    campaignId,
    MAX_ACTIVITY_ENTRIES,
  );

  if (error) {
    logFailure("listCampaignActivity", error);
    return undefined;
  }

  return readActivityLog(data);
}

/**
 * A CHANGE to a bar — seven damage, four healed — and never a total: the
 * database adds it to the row it has locked, so a second press from another
 * chair in the same breath is two changes rather than one overwriting the other.
 *
 * `seatCharacterId` is the CHAIR that pressed, null for the head of the table,
 * and it is only what the log entry gets filed under. Who may write is
 * `change_character_health`'s to decide, and `arm_table_log` puts the seat
 * itself back through `my_seat_at_table`.
 */
export async function changeCharacterHealth(
  campaignId,
  characterId,
  value,
  seatCharacterId = null,
) {
  const delta = parseHealthChange(value);

  if (delta === null) {
    return rejected("Hit points have to be a number.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("changeCharacterHealth", authError);
  }

  const { data, error } = await updateCharacterHealth(supabase, {
    id: characterId,
    delta,
    campaignId,
    seatCharacterId,
  });

  if (error) {
    const copy = TABLE_COPY[error.reason];

    logUncovered("changeCharacterHealth", error, copy);
    return rejected(copy ?? "Could not set that. Try again.");
  }

  return {
    kind: "success",
    // Where the bar ended up, by the row's own arithmetic: ten damage against
    // seven hit points is a change of seven.
    hitPoints: data.currentHp,
    activity: await freshLog(supabase, campaignId),
  };
}

/**
 * `parseHitPoints` is the wrong rule here: it clamps to 0..MAX_HP, which reads a
 * heal of minus four as a heal of nothing. The sign is kept and the magnitude
 * bounded instead. Zero is not an event.
 */
function parseHealthChange(value) {
  const delta = Number(value);

  return Number.isInteger(delta) && delta !== 0 && Math.abs(delta) <= MAX_HP
    ? delta
    : null;
}

/**
 * A mark is spent by whoever holds it and given by whoever runs the session, so
 * a refusal here is "not yours to move" rather than "that is gone".
 */
const INSPIRATION_COPY = {
  not_found: "That mark is not yours to move.",
  invalid_value: "That is outside what a character sheet can hold.",
  missing_column: "That part of the app is not ready yet.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer at this table.",
};

/**
 * One mark of inspiration, given or spent. `delta` is ±1 — a pip is one press —
 * and `move_character_inspiration` decides who may send which: the head of the
 * table both ways for anybody, a player only downwards and only their own.
 *
 * Nothing is revalidated and no line is written: the pips are held in
 * table-state.jsx, and a mark is not one of the ten things the log keeps.
 */
export async function moveInspiration(campaignId, characterId, delta) {
  if (!Number.isInteger(delta) || delta === 0) {
    return rejected("That is not a mark to move.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("moveInspiration", authError);
  }

  const { data, error } = await moveCharacterInspiration(supabase, {
    campaignId,
    characterId,
    delta,
  });

  if (error) {
    const copy = INSPIRATION_COPY[error.reason];

    logUncovered("moveInspiration", error, copy);
    return rejected(copy ?? "Could not move that. Try again.");
  }

  return { kind: "success", inspiration: data.inspiration };
}

/**
 * One note, into whichever book the writer's seat owns. A `characterId` is a
 * player writing from their character; `null` is the Dungeon Master writing on
 * the campaign, the only note that belongs to no sheet. Which of those the
 * caller may do is the two tables' INSERT policies to decide, and a refusal
 * comes back as no row rather than as a failure.
 *
 * The ledger comes back with it, for the reason the log does above. A note is
 * the writer's own, so there is nothing to tell the table about.
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

  const ledger = characterId
    ? await listCharacterNotes(supabase, characterId)
    : await listCampaignNotes(supabase, campaignId);

  if (ledger.error) {
    logFailure(
      characterId ? "listCharacterNotes" : "listCampaignNotes",
      ledger.error,
    );
  }

  return { kind: "success", notes: ledger.error ? undefined : ledger.data };
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

  // The board holds its own tokens — see use-table-marks.js — and the one this
  // describes was drawn under the pointer before the call was made.
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

  return { kind: "success" };
}
