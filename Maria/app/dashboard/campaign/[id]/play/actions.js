"use server";

import { listCampaignActivity } from "sina/data/activity";
import {
  clearCampaignMark,
  deleteCampaignNote,
  insertCampaignNote,
  listCampaignNotes,
  placeCampaignMark,
  updateCampaignNote,
} from "sina/data/campaigns";
import {
  applyDamage,
  applyHeal,
  deleteCharacterNote,
  insertCharacterNote,
  listCharacterNotes,
  killCharacter as strikeCharacterDown,
  reviveCharacter,
  rollDeathSave,
  spendHitDie,
  updateAbilityScore,
  updateArmorClass,
  updateCharacterNote,
} from "sina/data/characters";
import { moveCharacterInspiration } from "sina/data/inspiration";
import { isAbilityId, parseAbilityTotal } from "sina/rules/ability-scores";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";
import { parseMarkPoint } from "sina/rules/campaign";
import { MAX_NOTE_LENGTH, parseNote } from "sina/rules/character";
import { parseArmorClass } from "sina/rules/death";
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

  /* Two doors and not one, because a hit point going down carries rules a hit
     point going up does not — massive damage, and the tallies a character
     collects at zero. `apply_damage` and `apply_heal` are the halves; the sign
     is what decides which. */
  const { data, error } =
    delta < 0
      ? await applyDamage(supabase, {
          id: characterId,
          damage: -delta,
          campaignId,
          seatCharacterId,
        })
      : await applyHeal(supabase, {
          id: characterId,
          heal: delta,
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
    ...condition(data),
    activity: await freshLog(supabase, campaignId),
  };
}

/**
 * The three things zero hit points decides, on every answer that could have
 * moved one of them. They travel together for the reason `setCondition` lays
 * them down together: a card drawn from two of the three is a card drawn
 * halfway through an event.
 */
function condition(data) {
  return {
    isDead: data.isDead,
    deathSaves: data.deathSaves,
    instantDeath: Boolean(data.instantDeath),
  };
}

/**
 * One death save, against the face the table's own d20 came to rest on.
 *
 * THE NUMBER IS THE BOARD'S. The dice are a physics simulation and cannot be
 * told what to land on, so the roll travels here rather than being generated —
 * one die, thrown once, seen by every chair, and the rules applied to it inside
 * `roll_death_save`. A caller with no board sends null and the database rolls.
 *
 * `null` from the function is a save nobody was entitled to ask for: a character
 * on their feet, one already gone, or a chair with no business at this card.
 */
export async function rollDeathSaveFor(
  campaignId,
  characterId,
  roll = null,
  seatCharacterId = null,
) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("rollDeathSaveFor", authError);
  }

  const { data, error } = await rollDeathSave(supabase, {
    id: characterId,
    roll,
    campaignId,
    seatCharacterId,
  });

  if (error) {
    const copy = DEATH_COPY[error.reason] ?? TABLE_COPY[error.reason];

    logUncovered("rollDeathSaveFor", error, copy);
    return rejected(copy ?? "Could not roll that. Try again.");
  }

  return {
    kind: "success",
    roll: data.roll,
    outcome: data.outcome,
    revived: data.revived,
    hitPoints: data.currentHp,
    ...condition(data),
    activity: await freshLog(supabase, campaignId),
  };
}

/**
 * The blow that finishes somebody already at zero.
 *
 * THE HEAD OF THE TABLE'S ALONE, and only on a character who is DOWN — a player
 * must not be able to end their own from a card any more than they may undo it,
 * and `kill_character` asks `owns_campaign` for exactly that reason. It is what
 * that chair gets instead of somebody else's death saves: the three rolls are
 * the one thing a dying character still does for themselves.
 */
export async function killCharacter(campaignId, characterId) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("killCharacter", authError);
  }

  const { data, error } = await strikeCharacterDown(supabase, {
    id: characterId,
    campaignId,
  });

  if (error) {
    const copy = DEATH_COPY[error.reason] ?? TABLE_COPY[error.reason];

    logUncovered("killCharacter", error, copy);
    return rejected(copy ?? "Could not do that. Try again.");
  }

  return {
    kind: "success",
    hitPoints: data.currentHp,
    ...condition(data),
    activity: await freshLog(supabase, campaignId),
  };
}

/**
 * Back on their feet at one hit point. The head of the table's alone, and
 * `revive_character` is where that is decided — it asks `owns_campaign` rather
 * than `may_move_character`, so a player cannot undo their own death.
 */
export async function reviveDownedCharacter(campaignId, characterId) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("reviveDownedCharacter", authError);
  }

  const { data, error } = await reviveCharacter(supabase, {
    id: characterId,
    campaignId,
  });

  if (error) {
    const copy = DEATH_COPY[error.reason] ?? TABLE_COPY[error.reason];

    logUncovered("reviveDownedCharacter", error, copy);
    return rejected(copy ?? "Could not bring them back. Try again.");
  }

  return {
    kind: "success",
    hitPoints: data.currentHp,
    ...condition(data),
    activity: await freshLog(supabase, campaignId),
  };
}

/**
 * One hit die out of the pool, spent on hit points.
 *
 * THE NUMBER IS THE BOARD'S, exactly as a death save's is: the dice cannot be
 * told what to land on, so the face travels here and `spend_hit_die` does the
 * arithmetic against it. The heal it turns into goes through `apply_heal`, so
 * the bar and the log answer as they do for any other one.
 *
 * `null` is a die nobody had to spend — an empty pool, a path that rolls none,
 * or a chair with no business at this card.
 */
export async function spendHitDieFor(
  campaignId,
  characterId,
  roll = null,
  seatCharacterId = null,
) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("spendHitDieFor", authError);
  }

  const { data, error } = await spendHitDie(supabase, {
    id: characterId,
    roll,
    campaignId,
    seatCharacterId,
  });

  if (error) {
    const copy = HIT_DICE_COPY[error.reason] ?? TABLE_COPY[error.reason];

    logUncovered("spendHitDieFor", error, copy);
    return rejected(copy ?? "Could not spend that. Try again.");
  }

  return {
    kind: "success",
    ...data,
    activity: await freshLog(supabase, campaignId),
  };
}

/** An empty pool and a chair with no business here read back the same way. */
const HIT_DICE_COPY = {
  not_found: "There is no hit die left to spend.",
  bad_id: "That character is no longer at this table.",
};

/**
 * The shield. No line in the log and nothing to reconcile beyond the number
 * itself: an armour class is a fact about a character rather than something
 * that happens at a table.
 */
export async function setArmorClass(campaignId, characterId, value) {
  const armorClass = parseArmorClass(value);

  if (armorClass === null) {
    return rejected("Armour class has to be a number.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("setArmorClass", authError);
  }

  const { data, error } = await updateArmorClass(supabase, {
    id: characterId,
    armorClass,
    campaignId,
  });

  if (error) {
    const copy = TABLE_COPY[error.reason];

    logUncovered("setArmorClass", error, copy);
    return rejected(copy ?? "Could not set that. Try again.");
  }

  return { kind: "success", armorClass: data.armorClass };
}

/**
 * One of the six scores, written by the head of the table. `value` is the TOTAL
 * the card prints; the column behind it holds the difference.
 *
 * ONLY THE DUNGEON MASTER, and not because of anything here: the function asks
 * whether the caller owns a campaign this character is playing in.
 */
export async function setAbilityScore(campaignId, characterId, ability, value) {
  const total = parseAbilityTotal(value);

  if (total === null || !isAbilityId(ability)) {
    return rejected("An ability score has to be a number.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("setAbilityScore", authError);
  }

  const { data, error } = await updateAbilityScore(supabase, {
    id: characterId,
    ability,
    total,
    campaignId,
  });

  if (error) {
    const copy = TABLE_COPY[error.reason];

    logUncovered("setAbilityScore", error, copy);
    return rejected(copy ?? "Could not set that. Try again.");
  }

  return { kind: "success", total: data.total };
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
 * A save asked for by somebody who had none to make, and a revival asked for by
 * anybody but the head of the table, both read back as no row.
 */
const DEATH_COPY = {
  not_found: "That is not yours to do at this card.",
  bad_id: "That character is no longer at this table.",
};

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

  return noteLedger(supabase, campaignId, characterId);
}

/**
 * A note rewritten. Which book it is in is the seat's, exactly as it is above,
 * and the id is checked against that book rather than trusted — `not_found`
 * here is "that is not yours to rewrite" as much as "that is gone", and the two
 * must not be told apart.
 *
 * `not_found` gets a wording of its own: TABLE_COPY speaks about a character,
 * and the thing that went missing is a line somebody wrote.
 */
export async function reviseTableNote(campaignId, characterId, noteId, value) {
  const body = parseNote(value);

  if (!body) {
    return rejected(`A note is 1 to ${MAX_NOTE_LENGTH} characters.`);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("reviseTableNote", authError);
  }

  const { error } = characterId
    ? await updateCharacterNote(supabase, { id: noteId, characterId, body })
    : await updateCampaignNote(supabase, { id: noteId, campaignId, body });

  if (error) {
    const copy = NOTE_COPY[error.reason] ?? TABLE_COPY[error.reason];

    logUncovered("reviseTableNote", error, copy);
    return rejected(copy ?? "Could not rewrite that. Try again.");
  }

  return noteLedger(supabase, campaignId, characterId);
}

/** The same door the other way. A note struck out is gone, not hidden. */
export async function eraseTableNote(campaignId, characterId, noteId) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("eraseTableNote", authError);
  }

  const { error } = characterId
    ? await deleteCharacterNote(supabase, { id: noteId, characterId })
    : await deleteCampaignNote(supabase, { id: noteId, campaignId });

  if (error) {
    const copy = NOTE_COPY[error.reason] ?? TABLE_COPY[error.reason];

    logUncovered("eraseTableNote", error, copy);
    return rejected(copy ?? "Could not strike that out. Try again.");
  }

  return noteLedger(supabase, campaignId, characterId);
}

/** What the two above and `writeTableNote` all hand back: the book, re-read. */
async function noteLedger(supabase, campaignId, characterId) {
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
 * A note is refused rather than failed when the book is not the caller's, so
 * `not_found` here is "that line is not yours" as much as "that line is gone".
 */
const NOTE_COPY = {
  not_found: "That note is no longer there.",
  bad_id: "That note is no longer there.",
};

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
