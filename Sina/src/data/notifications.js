/**
 * Every read and write against the `notifications` table. Failures come back as
 * a `reason` code, not a sentence.
 *
 * Four of these go through RPC rather than a table call, and for two different
 * reasons. `send_campaign_invite` writes into somebody else's inbox, which no
 * policy grants and none should; `accept_campaign_invite` writes a party row
 * for a campaign the caller does not own, and has to do it in the same
 * transaction that closes the invitation. See the migration for both.
 */

import { MAX_NOTIFICATIONS } from "../rules/notifications.js";

/** `user_id` is deliberately absent: it must not travel to the client. */
const COLUMNS = "id, type, title, message, data, status, created_at";

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

/**
 * The tokens the migration's functions raise, mapped to the codes Maria writes
 * copy for. These have no SQLSTATE of their own — `raise exception` is P0001
 * whatever it says — so they are matched on the message, and they stop being
 * recognised if the migration changes a string.
 */
const RAISED = [
  ["campaign_not_found", "campaign_not_found"],
  ["character_not_found", "character_not_found"],
  ["already_added", "already_added"],
  ["party_limit_reached", "party_full"],
  ["invite_pending", "invite_pending"],
  ["invite_not_found", "invite_not_found"],
  ["announce_limit_reached", "announce_limit_reached"],
  ["invalid_version", "invalid_version"],
  ["not_signed_in", "not_signed_in"],
];

function classify(error) {
  for (const [token, reason] of RAISED) {
    if (error.message?.includes(token)) {
      return reason;
    }
  }

  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // Reachable only if a function stops catching it — both indexes that can
  // raise this are handled inside the migration.
  if (error.code === UNIQUE_VIOLATION) {
    return "invite_pending";
  }

  // The recipient's account went away between the lookup and the insert.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  if (error.code === UNDEFINED_TABLE) {
    return "missing_table";
  }

  if (error.code === UNDEFINED_FUNCTION) {
    return "missing_function";
  }

  // A malformed uuid: Postgres refuses the cast before considering a row.
  if (error.code === INVALID_TEXT_REPRESENTATION) {
    return "bad_id";
  }

  return "unknown";
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

/**
 * The inbox, newest first. Dismissed rows are left behind rather than deleted —
 * a dismissed announcement is still the record of which version its reader has
 * been told about, which is what stops the next page load announcing it again.
 */
export async function listNotifications(supabase, userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .eq("user_id", userId)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
    .limit(MAX_NOTIFICATIONS);

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * The newest release this account has been told about, or null. Read separately
 * from the list above because that one hides dismissed rows and this one must
 * not: sweeping an announcement away is not the same as never having had it.
 */
export async function latestAnnouncedVersion(supabase, userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("data")
    .eq("user_id", userId)
    .eq("type", "system_changelog")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  return { data: data?.data?.version ?? null, error: null };
}

/**
 * Puts an invitation in the character owner's inbox. The caller learns that it
 * was sent and nothing about who received it.
 */
export async function sendCampaignInvite(
  supabase,
  { campaignId, characterId },
) {
  const { data, error } = await supabase.rpc("send_campaign_invite", {
    p_campaign_id: campaignId,
    p_character_id: characterId,
  });

  return error ? failure(error) : { data: { id: data }, error: null };
}

/**
 * Joins the party and closes the invitation, in one transaction. Returns the
 * campaign that was joined, which is what the caller revalidates.
 */
export async function acceptCampaignInvite(supabase, notificationId) {
  const { data, error } = await supabase.rpc("accept_campaign_invite", {
    p_notification_id: notificationId,
  });

  return error ? failure(error) : { data: { campaignId: data }, error: null };
}

/**
 * A plain UPDATE rather than an RPC: declining touches one row, the caller's
 * own, and the policy already says so. `status = 'pending'` in the filter is
 * what makes a second click a miss instead of reopening a settled answer.
 */
export async function declineCampaignInvite(supabase, { id, userId }) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ status: "declined" })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("type", "campaign_invite")
    .eq("status", "pending")
    .select("id");

  if (error) {
    return failure(error);
  }

  if (!data || data.length === 0) {
    return {
      data: null,
      error: { reason: "invite_not_found", detail: "no row" },
    };
  }

  return { data: { id }, error: null };
}

/**
 * Opening the inbox is what reads an announcement. Invitations are left alone:
 * they stay unread until they are answered, which is what keeps the pip lit on
 * a request nobody has replied to.
 */
export async function markAnnouncementsRead(supabase, userId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ status: "read" })
    .eq("user_id", userId)
    .eq("type", "system_changelog")
    .eq("status", "pending")
    .select("id");

  return error
    ? failure(error)
    : { data: { count: data?.length ?? 0 }, error: null };
}

/**
 * Sweeps one row out of the inbox, answered or not.
 *
 * An unanswered invitation may be cleared, and clearing one is not the same as
 * declining it: the row leaves `pending`, so the pip goes out and the partial
 * unique index frees, which means the Dungeon Master may ask again. What it is
 * not is a reply — nothing is sent back, and `accept_campaign_invite` will no
 * longer take it.
 */
export async function dismissNotification(supabase, { id, userId }) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return failure(error);
  }

  if (!data || data.length === 0) {
    return { data: null, error: { reason: "not_found", detail: "no row" } };
  }

  return { data: { id }, error: null };
}

/**
 * Announces a release to the caller. `data` is null when this version had
 * already been announced, which is the ordinary outcome — the unique index
 * makes it idempotent, so calling it twice is not an error.
 */
export async function announceVersion(supabase, { version, title, message }) {
  const { data, error } = await supabase.rpc("announce_version", {
    p_version: version,
    p_title: title,
    p_message: message,
  });

  return error
    ? failure(error)
    : { data: data ? { id: data } : null, error: null };
}
