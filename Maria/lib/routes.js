/**
 * The handful of URLs more than one place has to agree on. Here rather than as
 * template literals through the app, because `components/` must never import
 * from a route directory and the corner grimoire has to recognise the table it
 * is standing down for.
 */

export function campaignSheetPath(campaignId) {
  return `/dashboard/campaign/${campaignId}`;
}

export function characterSheetPath(characterId) {
  return `/dashboard/character/${characterId}`;
}

/**
 * The seat a Dungeon Master takes, as against a character's id. A word rather
 * than a uuid because there is no row behind it — the chair belongs to whoever
 * owns the campaign, and the campaign is already in the path.
 */
export const DUNGEON_MASTER_SEAT = "dm";

/**
 * The table, and which chair the visitor is taking at it.
 *
 * The seat rides in the query string because it is the one thing the path
 * cannot imply: an account can own the campaign AND a character in it, and only
 * the door they came through says which they meant. An unrecognised seat, or
 * none, falls back to the first the viewer owns — see readSeat.
 */
export function campaignTablePath(campaignId, seat) {
  const table = `${campaignSheetPath(campaignId)}/play`;

  return seat ? `${table}?seat=${encodeURIComponent(seat)}` : table;
}

const TABLE_PATH = /^\/dashboard\/campaign\/[^/]+\/play\/?$/;

export function isCampaignTablePath(pathname) {
  return TABLE_PATH.test(pathname ?? "");
}
