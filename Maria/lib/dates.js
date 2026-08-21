/**
 * Locale and time zone are both pinned. `toLocaleString()` reads them from the
 * host, and these run on the server and again in the browser, producing two
 * different strings for the same row — a hydration mismatch.
 */

/** A note's moment, to the minute: the table writes them, the sheet reads them. */
export const NOTE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
