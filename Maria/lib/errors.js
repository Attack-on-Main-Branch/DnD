/**
 * Where a backend failure goes once it stops being shown to the user. `detail`
 * is the verbatim Supabase or Postgres string, which must never reach the user
 * — that is what the reason codes exist to prevent.
 *
 * The only `console.*` calls in the app, and meant to stay so. Callers must be
 * Server Components or `"use server"` modules; that is convention rather than
 * enforcement, so a `"use client"` importer would put the detail in devtools.
 */
export function logFailure(action, error) {
  if (!error) {
    return;
  }

  console.error(`[${action}] ${error.reason}:`, error.detail);
}

/**
 * Logs only when the user is about to be told something generic. Keyed on the
 * copy rather than `reason === "unknown"`: a reason can be well classified and
 * still have no entry in a particular caller's map, which looks handled from
 * the data layer's side.
 */
export function logUncovered(action, error, copy) {
  if (!error || copy !== undefined) {
    return;
  }

  logFailure(action, error);
}
