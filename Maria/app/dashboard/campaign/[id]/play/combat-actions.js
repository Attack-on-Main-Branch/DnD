"use server";

import { listCampaignActivity } from "sina/data/activity";
import {
  advanceCombatTurn,
  endCombat,
  setTokenInitiative,
  startCombat,
} from "sina/data/combat";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";
import { parseInitiative } from "sina/rules/combat";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The fight's own writes. Every one is refused in `owns_campaign` rather than
 * here — this file carries the copy, which is the seam CLAUDE.md draws.
 *
 * Nothing calls `revalidatePath`; the numbers live in table-state.jsx. The two
 * that leave a log line hand the fresh list back in the same response, as the
 * deeds in actions.js do — an actor's name only ever comes off a row.
 */
const COMBAT_COPY = {
  not_found: "That fight is not yours to call.",
  invalid_value: "That is not an initiative.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  missing_column: "That part of the app is not ready yet.",
  bad_id: "That table is no longer there.",
};

function refusedCombat(action, error, fallback) {
  const copy = COMBAT_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

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

/** The cursor lands on whoever is highest, which may be nobody. */
export async function beginCombat(campaignId) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("beginCombat", authError);
  }

  const { error } = await startCombat(supabase, campaignId);

  if (error) {
    return refusedCombat("beginCombat", error, "Could not begin the fight.");
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}

/** Over: the cursor cleared, the round back to one, every number wiped. */
export async function concludeCombat(campaignId) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("concludeCombat", authError);
  }

  const { error } = await endCombat(supabase, campaignId);

  if (error) {
    return refusedCombat("concludeCombat", error, "Could not end the fight.");
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}

/** An empty box clears it, so `null` is a value here and not a missing
    argument. Bounded through the rules layer, and again by the CHECK. */
export async function writeInitiative(tokenId, initiative) {
  if (typeof tokenId !== "string" || tokenId.length === 0) {
    return rejected("That piece is no longer there.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("writeInitiative", authError);
  }

  const { error } = await setTokenInitiative(supabase, {
    tokenId,
    initiative: parseInitiative(initiative),
  });

  if (error) {
    return refusedCombat(
      "writeInitiative",
      error,
      "Could not write that initiative.",
    );
  }

  return { kind: "success" };
}

/** Off the bottom is the top again, a round later. */
export async function nextCombatTurn(campaignId) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("nextCombatTurn", authError);
  }

  const { error } = await advanceCombatTurn(supabase, campaignId);

  if (error) {
    return refusedCombat("nextCombatTurn", error, "Could not pass the turn.");
  }

  return { kind: "success" };
}
