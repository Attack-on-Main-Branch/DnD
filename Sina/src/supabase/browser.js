import { createBrowserClient } from "@supabase/ssr";

import { AUTH_COOKIE_OPTIONS, supabaseEnv } from "../env.js";

/**
 * NOT WIRED UP, and it will not work as written. `AUTH_COOKIE_OPTIONS` sets
 * `httpOnly: true`, which is invisible to `document.cookie`, so this client
 * would silently return no session rather than failing loudly. That is also why
 * `./supabase/browser` is absent from this package's `exports`.
 *
 * Wiring it up means re-deciding the trade-off: its own options without
 * `httpOnly`, accepting that a script on the page can read the refresh token,
 * or keeping the work on the server. Restore the export in the same commit.
 */
export function createBrowserSupabase() {
  const { url, anonKey } = supabaseEnv();

  return createBrowserClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
  });
}
