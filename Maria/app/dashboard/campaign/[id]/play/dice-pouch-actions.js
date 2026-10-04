"use server";

import {
  listCampaignActivity,
  recordCampaignActivity,
} from "sina/data/activity";
import {
  announceDiceSkins,
  listDiceSkinUnlocks,
  openDicePouch,
} from "sina/data/dice-pouch";
import { grantInventoryItem } from "sina/data/inventory";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";
import { dicePouchPool, unlockedDiceSkins } from "sina/rules/dice-pouch";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

import { DICE_POUCH_ITEM } from "./dice-pouch-presentation";

/**
 * A Dice Pouch handed out, opened, and told to the table. Opening and telling
 * are two calls on purpose: the log waits for the reel to stop — see
 * 20261004230000.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
const POUCH_COPY = {
  not_found: "There is no dice pouch here to open.",
  collection_complete:
    "Every dice set is already yours — there is nothing left in a pouch for you.",
  dm_only: "Only the Dungeon Master can hand out a dice pouch.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer at this table.",
};

/** A grant that matched nobody is a character gone, not a pouch missing. */
const GIVE_COPY = {
  ...POUCH_COPY,
  not_found: "That character is no longer at this table.",
};

async function signedIn(action) {
  const supabase = await createClient();
  const { user, error } = await getCurrentUser(supabase);

  return user ? { supabase } : { rejection: sessionRejection(action, error) };
}

function refused(action, error, fallback, copies = POUCH_COPY) {
  const copy = copies[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/** Absent rather than failed when it cannot be read. */
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
 * One pouch into each pack the session panel is aimed at, passing over anybody
 * who has already found every set. Logged the way `grantPackItems` logs: one
 * pack is the trigger's line, several are one line written here.
 */
export async function giveDicePouches(campaignId, characterIds) {
  const targets = [
    ...new Set(
      (characterIds ?? []).filter((id) => typeof id === "string" && id),
    ),
  ];

  if (targets.length === 0) {
    return rejected("Choose who is being given it.");
  }

  const { supabase, rejection } = await signedIn("giveDicePouches");

  if (rejection) {
    return rejection;
  }

  const unlocks = await listDiceSkinUnlocks(supabase, targets);

  if (unlocks.error) {
    logFailure("listDiceSkinUnlocks", unlocks.error);
  }

  const rows = unlocks.data ?? [];
  const receiving = targets.filter(
    (id) =>
      dicePouchPool(
        unlockedDiceSkins(rows.filter((row) => row.character_id === id)),
      ).length > 0,
  );

  if (receiving.length === 0) {
    return rejected(
      targets.length === 1
        ? "They have already found every dice set."
        : "Everybody chosen has already found every dice set.",
    );
  }

  const alone = receiving.length === 1;

  const results = await Promise.all(
    receiving.map((characterId) =>
      grantInventoryItem(supabase, {
        characterId,
        item: DICE_POUCH_ITEM,
        quantity: 1,
        campaignId,
        seatCharacterId: null,
        deed: alone ? "item_granted" : null,
      }),
    ),
  );

  const failed = results.find((result) => result.error);

  if (failed) {
    return refused(
      "giveDicePouches",
      failed.error,
      "Could not hand that over.",
      GIVE_COPY,
    );
  }

  if (!alone) {
    const { error } = await recordCampaignActivity(supabase, {
      campaignId,
      actorCharacterId: null,
      action: "item_granted",
      targetCharacterId: null,
      itemName: DICE_POUCH_ITEM.name,
      quantity: 1,
    });

    if (error) {
      logFailure("giveDicePouches/record", error);
    }
  }

  return {
    kind: "success",
    given: receiving,
    activity: await freshLog(supabase, campaignId),
  };
}

/** One pouch opened, and the set it held — which nobody else is told yet. */
export async function openPouch(campaignId, characterId) {
  if (typeof characterId !== "string" || characterId.length === 0) {
    return rejected("Missing character id.");
  }

  const { supabase, rejection } = await signedIn("openPouch");

  if (rejection) {
    return rejection;
  }

  const { data, error } = await openDicePouch(supabase, {
    campaignId,
    characterId,
  });

  if (error) {
    return refused("openPouch", error, "Could not open the pouch. Try again.");
  }

  return { kind: "success", skin: data.skin };
}

/**
 * The table told, once the reel has stopped. Never a refusal: the set is
 * already theirs, and a line that could not be written is the next opening's
 * to write.
 */
export async function announcePouch(campaignId, characterId) {
  const { supabase, rejection } = await signedIn("announcePouch");

  if (rejection) {
    return rejection;
  }

  const { error } = await announceDiceSkins(supabase, {
    campaignId,
    characterId,
  });

  if (error) {
    logFailure("announceDiceSkins", error);
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}
