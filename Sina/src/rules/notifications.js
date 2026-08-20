/**
 * What a notification is, and what a release announcement is worth announcing.
 * The counterpart to campaign.js: imported by the browser for the pip and the
 * cards, and by the Server Actions for the run that counts.
 *
 * No copy here. A notification's sentence is Maria's, and the type and status
 * codes below are all this layer says about one.
 */

/** Mirrored by the `type` CHECK in 20260820120000_notifications.sql. */
export const NOTIFICATION_TYPES = ["campaign_invite", "system_changelog"];

/** Mirrored by the `status` CHECK in the same migration. */
export const NOTIFICATION_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "read",
  "dismissed",
];

/**
 * How many the inbox holds. The list is read whole on every page load, so this
 * is a ceiling on that payload rather than a rule about what may exist.
 */
export const MAX_NOTIFICATIONS = 30;

/** Mirrored by the `title` and `message` CHECK constraints. */
export const MAX_NOTIFICATION_TITLE_LENGTH = 120;
export const MAX_NOTIFICATION_MESSAGE_LENGTH = 400;

/**
 * Unread is `pending`, for both types, which is what the column defaults to.
 *
 * An invitation therefore stays unread until it is answered rather than until
 * it is looked at: it is an outstanding request, and the pip is the only thing
 * on the page that says so. An announcement leaves `pending` the moment the
 * inbox is opened.
 */
export function isUnread(notification) {
  return notification?.status === "pending";
}

export function countUnread(notifications) {
  return (notifications ?? []).filter(isUnread).length;
}

/** An invitation still waiting on an answer, which is the only kind with buttons. */
export function isAnswerable(notification) {
  return notification?.type === "campaign_invite" && isUnread(notification);
}

const VERSION_PATTERN = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/;

/**
 * SemVer order, on the `0.x.y` subset this project uses. Returns -1, 0 or 1,
 * and treats anything unparseable as older than everything — a version that
 * cannot be read is not evidence that the reader has seen the current one.
 *
 * Numeric per part, not lexicographic: "0.10.0" is newer than "0.9.0", which a
 * string comparison gets backwards.
 */
export function compareVersions(left, right) {
  const a = VERSION_PATTERN.exec(String(left ?? ""));
  const b = VERSION_PATTERN.exec(String(right ?? ""));

  if (!a) {
    return b ? -1 : 0;
  }

  if (!b) {
    return 1;
  }

  for (let part = 1; part <= 3; part += 1) {
    const difference = Number(a[part]) - Number(b[part]);

    if (difference !== 0) {
      return difference < 0 ? -1 : 1;
    }
  }

  return 0;
}

/**
 * Whether this release still has to be announced to somebody who last saw
 * `seen`. Strictly newer, so a rollback does not re-announce an older release
 * that the same person has already been told about.
 */
export function shouldAnnounce(current, seen) {
  return VERSION_PATTERN.test(String(current ?? ""))
    ? compareVersions(current, seen) > 0
    : false;
}

/**
 * The handle a notification's `data` names, or null. Used for the invite card,
 * which is drawn from `data` rather than from the stored sentence.
 */
export function inviteDetails(notification) {
  const data = notification?.data;

  if (!data || typeof data !== "object") {
    return null;
  }

  const { campaign_id, campaign_title, character_id, character_name } = data;

  if (!campaign_id || !character_id) {
    return null;
  }

  return {
    campaignId: campaign_id,
    campaignTitle: campaign_title ?? "a campaign",
    characterId: character_id,
    characterName: character_name ?? "A character",
    characterDiscriminator: data.character_discriminator ?? null,
  };
}
