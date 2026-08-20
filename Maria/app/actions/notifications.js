"use server";

import { revalidatePath } from "next/cache";
import { sessionAccessToken } from "sina/data/auth";
import {
  acceptCampaignInvite as accept,
  announceVersion,
  declineCampaignInvite as decline,
  dismissNotification as dismiss,
  latestAnnouncedVersion,
  markAnnouncementsRead as markRead,
} from "sina/data/notifications";
import { MAX_PARTY } from "sina/rules/campaign";
import { shouldAnnounce } from "sina/rules/notifications";

import { versionNotice } from "@/app/components/notifications/version-notice";
import { logFailure, logUncovered } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

function rejected(message, field = null) {
  return { kind: "rejected", field, message };
}

/**
 * No error means auth said no and signing in again fixes it; an error means it
 * could not answer. Local to each actions file, as `rejected` is.
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
const INVITE_COPY = {
  invite_not_found: "That invitation has already been answered.",
  party_full: `That party is full at ${MAX_PARTY} characters.`,
  already_added: "That character is already in the party.",
  character_not_found: "That character is no longer in your roster.",
  campaign_not_found: "That campaign no longer exists.",
  not_found: "That invitation is no longer there.",
  bad_id: "That invitation could not be found.",
  missing_table:
    "The notifications table does not exist yet. Run the migrations in Sina/supabase/migrations.",
  missing_function:
    "The invitation functions are missing. Run the migrations in Sina/supabase/migrations.",
};

/**
 * Joins the party and closes the invitation, in one transaction inside the
 * database — the party cap and the answered invitation have to agree, and two
 * round trips from here could not promise that.
 */
export async function acceptCampaignInvite(notificationId) {
  if (typeof notificationId !== "string" || notificationId.length === 0) {
    return rejected("Missing invitation id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("acceptCampaignInvite", authError);
  }

  const { error } = await accept(supabase, notificationId);

  if (error) {
    const copy = INVITE_COPY[error.reason];
    logUncovered("acceptCampaignInvite", error, copy);

    // Every one of these means the card on screen no longer matches the table.
    revalidatePath("/dashboard", "layout");

    return rejected(copy ?? "Could not accept that invitation.");
  }

  revalidatePath("/dashboard", "layout");
  return { kind: "success" };
}

export async function declineCampaignInvite(notificationId) {
  if (typeof notificationId !== "string" || notificationId.length === 0) {
    return rejected("Missing invitation id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("declineCampaignInvite", authError);
  }

  const { error } = await decline(supabase, {
    id: notificationId,
    userId: user.id,
  });

  if (error) {
    // Already answered is the outcome the click wanted. Ahead of logUncovered,
    // or a second click on a card that is on its way out logs an error.
    if (error.reason === "invite_not_found") {
      revalidatePath("/dashboard", "layout");
      return { kind: "success" };
    }

    const copy = INVITE_COPY[error.reason];
    logUncovered("declineCampaignInvite", error, copy);

    return rejected(copy ?? "Could not decline that invitation.");
  }

  revalidatePath("/dashboard", "layout");
  return { kind: "success" };
}

/** Sweeps one answered invitation or read announcement out of the inbox. */
export async function dismissNotification(notificationId) {
  if (typeof notificationId !== "string" || notificationId.length === 0) {
    return rejected("Missing notification id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("dismissNotification", authError);
  }

  const { error } = await dismiss(supabase, {
    id: notificationId,
    userId: user.id,
  });

  if (error) {
    if (error.reason === "not_found") {
      revalidatePath("/dashboard", "layout");
      return { kind: "success" };
    }

    const copy = INVITE_COPY[error.reason];
    logUncovered("dismissNotification", error, copy);

    return rejected(copy ?? "Could not clear that notification.");
  }

  revalidatePath("/dashboard", "layout");
  return { kind: "success" };
}

/**
 * Opening the inbox is what reads an announcement. Invitations are untouched —
 * one stays unread until it is answered, which is what keeps the pip lit on a
 * request nobody has replied to.
 */
export async function markAnnouncementsRead() {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("markAnnouncementsRead", authError);
  }

  const { error } = await markRead(supabase, user.id);

  if (error) {
    logFailure("markAnnouncementsRead", error);
    return rejected("Could not mark those as read.");
  }

  revalidatePath("/dashboard", "layout");
  return { kind: "success" };
}

/**
 * Announces this release to the caller, once. The insert is idempotent — a
 * unique index on (recipient, version) — so two tabs racing is not an error,
 * and `null` back means it had already been announced.
 */
export async function announceCurrentVersion() {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("announceCurrentVersion", authError);
  }

  const notice = versionNotice();
  const { data: seen, error: seenError } = await latestAnnouncedVersion(
    supabase,
    user.id,
  );

  if (seenError) {
    logFailure("announceCurrentVersion/seen", seenError);
    return rejected("Could not check which release you last saw.");
  }

  if (!shouldAnnounce(notice.version, seen)) {
    return { kind: "success", announced: false };
  }

  const { data, error } = await announceVersion(supabase, notice);

  if (error) {
    logFailure("announceCurrentVersion", error);
    return rejected("Could not post the release notice.");
  }

  if (data) {
    revalidatePath("/dashboard", "layout");
  }

  return { kind: "success", announced: Boolean(data) };
}

/**
 * The access token the Realtime socket authenticates with, or null.
 *
 * Handed to the browser deliberately, and it is the one credential that goes
 * there: the session cookies stay `httpOnly`, and this is a short-lived token
 * that Supabase verifies again at the other end. supabase-js asks for it on
 * every connect and resubscribe, so an expired one repairs itself without a
 * page reload — which is the whole point of this being a function rather than a
 * prop rendered once.
 */
export async function realtimeToken() {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return null;
  }

  const { data, error } = await sessionAccessToken(supabase);

  if (error) {
    logFailure("realtimeToken", error);
    return null;
  }

  return data;
}
