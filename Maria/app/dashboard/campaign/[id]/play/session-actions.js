"use server";

import { listCampaignActivity } from "sina/data/activity";
import { listPartyMembers } from "sina/data/campaigns";
import { performLongRest, performShortRest } from "sina/data/rest";
import { modifyCharacterXp } from "sina/data/xp";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";
import { isRestType } from "sina/rules/rest";
import { MAX_XP_AWARD, parseXpDelta } from "sina/rules/xp";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The session panel's two writes: what the party has earned, and the rests.
 *
 * No `revalidatePath`, for the reason actions.js gives next door. Both deeds are
 * ONE round trip however many characters they reach, and the log entries are the
 * database's own — so each reads the fresh list back in the same request.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
const SESSION_COPY = {
  not_found: "That is not yours to change.",
  invalid_value: "That is outside what a character sheet can hold.",
  missing_column: "That part of the app is not ready yet.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer at this table.",
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

function refused(action, error, fallback) {
  const copy = SESSION_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/**
 * Experience given or taken back. `characterIds` is WHO; the RPC narrows it to
 * the ones the caller may write for. `sign` and a positive figure rather than a
 * signed one: the field asks "how much", the two buttons are the direction.
 */
export async function adjustCharacterXp(
  campaignId,
  characterIds,
  amount,
  sign,
  seatCharacterId = null,
) {
  const magnitude = parseXpDelta(amount);

  if (magnitude === null) {
    return rejected(`Experience is 1 to ${MAX_XP_AWARD} at a time.`);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("adjustCharacterXp", authError);
  }

  const { data, error } = await modifyCharacterXp(supabase, {
    campaignId,
    characterIds,
    delta: sign < 0 ? -magnitude : magnitude,
    seatCharacterId,
  });

  if (error) {
    return refused(
      "adjustCharacterXp",
      error,
      "Could not record that. Try again.",
    );
  }

  /* A rung that moved moved hit points with it — `characters_sync_max_hp` sees
     to that — and neither figure can be worked out from what the browser
     painted. The party comes back with the award so the bars move on the same
     frame as the ring. */
  const climbed = data.some((one) => one.levelsGained !== 0);
  const party = climbed ? await listPartyMembers(supabase, campaignId) : null;

  if (party?.error) {
    logFailure("listPartyMembers", party.error);
  }

  return {
    kind: "success",
    // Where every character landed, by the row's own arithmetic: an award that
    // crossed a threshold comes back on the rung above.
    awarded: data,
    party: party && !party.error ? party.data : undefined,
    activity: await freshLog(supabase, campaignId),
  };
}

/** A rest, for whoever the panel is aimed at. `trigger_rest` says who that may be. */
export async function takeRest(
  campaignId,
  characterIds,
  restType,
  seatCharacterId = null,
) {
  if (!isRestType(restType)) {
    return rejected("That is not a rest.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("takeRest", authError);
  }

  const rest = restType === "long" ? performLongRest : performShortRest;

  const { data, error } = await rest(supabase, {
    campaignId,
    characterIds,
    seatCharacterId,
  });

  if (error) {
    return refused("takeRest", error, "Could not rest. Try again.");
  }

  return {
    kind: "success",
    // The numbers everybody woke on, in the shape the store paints a rest with.
    rested: data,
    activity: await freshLog(supabase, campaignId),
  };
}
