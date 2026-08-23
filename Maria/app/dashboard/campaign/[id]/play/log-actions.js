"use server";

import { revalidatePath } from "next/cache";
import { recordCampaignActivity } from "sina/data/activity";
import { ACTION_TYPES } from "sina/rules/activity";
import { isDie, readDieResult } from "sina/rules/dice";
import { MAX_HP } from "sina/rules/health";
import { MAX_LEVEL, MIN_LEVEL } from "sina/rules/level";
import { MAX_ITEM_NAME_LENGTH, parseQuantity } from "sina/rules/inventory";

import { logFailure } from "@/lib/errors";
import { campaignTablePath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The one write behind the activity log, and the one Server Action in this
 * directory that never speaks to the user.
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

/** Null for anything that is not the shape its action calls for. */
function readEntry(entry) {
  const action = entry?.action;

  if (!ACTION_TYPES.includes(action)) {
    return null;
  }

  if (action === "secret_dice_roll") {
    return isDie(entry.die) ? { die: entry.die } : null;
  }

  if (action === "dice_roll") {
    const value = isDie(entry.die)
      ? readDieResult(entry.die, entry.value)
      : null;

    return value === null ? null : { die: entry.die, value };
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
 */
export async function recordActivity(campaignId, actorCharacterId, entry) {
  const values = readEntry(entry);

  if (!values) {
    return false;
  }

  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);

  if (!user) {
    return false;
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
    return false;
  }

  revalidatePath(campaignTablePath(campaignId));
  return true;
}
