/**
 * Where a backend failure goes once it stops being shown to the user.
 *
 * `detail` is the verbatim string from Supabase or Postgres. The actions used
 * to fall back to it whenever a reason had no copy, which put constraint names
 * and SDK internals in front of the user — the exact thing the reason codes
 * exist to prevent. Dropping it entirely would have thrown away the only
 * description of an unclassified failure, so it comes here instead.
 *
 * The only `console.*` calls in the app, and meant to stay so. Every caller is
 * a Server Component or a `"use server"` module, which is convention rather
 * than enforcement — `server-only` is not a dependency here — so a
 * `"use client"` importer would relocate the original bug into devtools.
 */
export function logFailure(action, error) {
  if (!error) {
    return;
  }

  console.error(`[${action}] ${error.reason}:`, error.detail);
}

/**
 * Logs only when the user is about to be told something generic. Pass the copy
 * that was looked up: if it resolved, they are getting a sentence somebody
 * wrote and logging it too is noise.
 *
 * Keyed on the copy rather than on `reason === "unknown"`, which is the trap
 * this replaced — a reason can be well classified and still have no entry in a
 * particular caller's map (`rate_limited` reaching `updateUsername` was exactly
 * that), and those look handled from the data layer's side.
 */
export function logUncovered(action, error, copy) {
  if (!error || copy !== undefined) {
    return;
  }

  logFailure(action, error);
}
