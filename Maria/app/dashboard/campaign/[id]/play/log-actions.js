"use server";

import {
  listCampaignActivity,
  recordCampaignActivity,
} from "sina/data/activity";
import {
  ACTION_TYPES,
  MAX_ACTIVITY_ENTRIES,
  readActivityLog,
} from "sina/rules/activity";
import { isCoin, parseCoins } from "sina/rules/currency";
import { isDie, parseDiceCount, readDiceResult } from "sina/rules/dice";
import { MAX_HP } from "sina/rules/health";
import { MAX_LEVEL, MIN_LEVEL } from "sina/rules/level";
import { MAX_ITEM_NAME_LENGTH, parseQuantity } from "sina/rules/inventory";
import {
  MAX_SPELL_EFFECT_LENGTH,
  MAX_SPELL_NAME_LENGTH,
  parseSpellLevel,
} from "sina/rules/spells";

import { logFailure } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The write behind the activity log for everything the database cannot derive
 * for itself, and the one Server Action in this directory that never speaks to
 * the user.
 *
 * IT IS NO LONGER THE ONLY ONE. Since 20260830090000 a hit point, a level and a
 * stack moving in one pack each leave an entry written by a trigger. What still
 * comes through here is everything a single row change cannot be read back from:
 * the dice, which move no row; the purse, whose five columns are one sentence; a
 * cast, which is a slot and a name and what it threw; and a grant to the WHOLE
 * party, which is six transactions and one line.
 *
 * An entry describes something that HAS ALREADY HAPPENED — a die that landed, a
 * bar that moved, a potion that was drunk. Failing to write it down must
 * therefore never fail the deed, so every refusal comes back as a bare `false`
 * and goes to the log rather than to a `role="alert"`. There is nothing the
 * player could do about it and nothing they did wrong.
 *
 * The checks below are the same shape the pack and the board already run, and
 * the same division of labour: this is the fast, wrong-shape sieve, and
 * `record_campaign_activity` is the run that counts. That function derives the
 * actor's name, resolves the target's, and builds the payload itself — nothing
 * composed here reaches the column.
 */

const ITEM_ACTIONS = new Set([
  "item_used",
  "item_dropped",
  "item_transferred",
  "item_granted",
  "item_revoked",
]);

const COIN_ACTIONS = new Set([
  "coin_spent",
  "coin_transferred",
  "coin_granted",
  "coin_revoked",
]);

/** Null for anything that is not the shape its action calls for. */
function readEntry(entry) {
  const action = entry?.action;

  if (!ACTION_TYPES.includes(action)) {
    return null;
  }

  if (action === "secret_dice_roll" || action === "dice_roll") {
    const diceCount = parseDiceCount(entry.count);

    if (!isDie(entry.die) || diceCount === null) {
      return null;
    }

    // Nothing is written down about what a kept roll came to.
    if (action === "secret_dice_roll") {
      return { die: entry.die, diceCount };
    }

    // A TOTAL, bounded against the handful that made it: 14 is a face no d6
    // has and an ordinary 3d6.
    const value = readDiceResult(entry.die, diceCount, entry.value);

    return value === null ? null : { die: entry.die, diceCount, value };
  }

  if (action === "hp_change") {
    const delta = Number(entry.delta);

    // A change, never a total, and never a change of nothing. The target is
    // whose bar moved and is always named, even when it is the actor's own —
    // the database is what decides whether to write the second name down.
    return Number.isInteger(delta) &&
      delta !== 0 &&
      Math.abs(delta) <= MAX_HP &&
      entry.targetCharacterId
      ? { delta, targetCharacterId: entry.targetCharacterId }
      : null;
  }

  if (action === "level_change") {
    const level = Number(entry.level);
    const delta = Number(entry.delta);

    /* Refused rather than clamped, unlike `parseLevel`: this describes a write
       that has already landed, so a level outside the ring's ends is a caller
       disagreeing with the row rather than a figure to round in. */
    return Number.isInteger(level) &&
      level >= MIN_LEVEL &&
      level <= MAX_LEVEL &&
      Number.isInteger(delta) &&
      delta !== 0 &&
      Math.abs(delta) < MAX_LEVEL &&
      entry.targetCharacterId
      ? { level, levelDelta: delta, targetCharacterId: entry.targetCharacterId }
      : null;
  }

  /**
   * A denomination and an amount, never a balance: the log says what happened,
   * and the badge beside it already says where that left them. The target is
   * null for a spend, which names nobody, and for a grant to the whole party —
   * `record_campaign_activity` is what turns that null into "the party", and it
   * refuses one from anybody but the head of the table.
   */
  if (COIN_ACTIONS.has(action)) {
    const coinAmount = parseCoins(entry.amount);

    if (!isCoin(entry.coin) || coinAmount === null || coinAmount < 1) {
      return null;
    }

    return {
      coin: entry.coin,
      coinAmount,
      targetCharacterId: entry.targetCharacterId ?? null,
    };
  }

  /**
   * A name, the slot it was cast FROM — not the level it is written at — and
   * what it threw. Nobody at the other end: a spell is cast at the table.
   */
  if (action === "spell_cast") {
    const spellName = String(entry.spellName ?? "")
      .trim()
      .slice(0, MAX_SPELL_NAME_LENGTH);
    const spellLevel = parseSpellLevel(entry.spellLevel);

    if (!spellName || spellLevel === null) {
      return null;
    }

    /* Empty is a spell that rolls nothing and asks nothing; the database
       writes no key at all for those. */
    const effect = (value) =>
      String(value ?? "")
        .trim()
        .slice(0, MAX_SPELL_EFFECT_LENGTH) || null;

    return {
      spellName,
      spellLevel,
      spellDamage: effect(entry.spellDamage),
      spellSave: effect(entry.spellSave),
    };
  }

  if (!ITEM_ACTIONS.has(action)) {
    return null;
  }

  const itemName = String(entry.itemName ?? "")
    .trim()
    .slice(0, MAX_ITEM_NAME_LENGTH);
  const quantity = parseQuantity(entry.quantity);

  if (!itemName || quantity === null || quantity < 1) {
    return null;
  }

  return {
    itemName,
    quantity,
    targetCharacterId: entry.targetCharacterId ?? null,
  };
}

/**
 * `actorCharacterId` is the chair the entry is filed under, and null is the
 * head of the table — always the SEAT that acted, never the character acted
 * upon. Who was acted upon rides in the entry as `targetCharacterId`, and
 * `record_campaign_activity` resolves the name for it.
 *
 * The whole list comes back with the entry rather than a `revalidatePath` that
 * would make this response carry a re-rendered board. That read is the only
 * thing a name may come from. Null is a refusal, and refusals here are not shown.
 */
export async function recordActivity(campaignId, actorCharacterId, entry) {
  const values = readEntry(entry);

  if (!values) {
    return null;
  }

  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);

  if (!user) {
    return null;
  }

  const { error } = await recordCampaignActivity(supabase, {
    campaignId,
    actorCharacterId: actorCharacterId ?? null,
    action: entry.action,
    ...values,
  });

  if (error) {
    // Nothing is shown, so every failure here is one nobody would otherwise
    // ever hear about: a log that has quietly stopped recording looks exactly
    // like a table where nothing has happened.
    logFailure("recordActivity", error);
    return null;
  }

  const { data, error: unread } = await listCampaignActivity(
    supabase,
    campaignId,
    MAX_ACTIVITY_ENTRIES,
  );

  if (unread) {
    logFailure("listCampaignActivity", unread);
  }

  return {
    kind: "success",
    activity: unread ? undefined : readActivityLog(data),
  };
}
