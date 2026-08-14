import { createBrowserClient } from "@supabase/ssr";

import { AUTH_COOKIE_OPTIONS, supabaseEnv } from "../env.js";

/**
 * Supabase client for the browser.
 *
 * `createBrowserClient` is a singleton by default, so calling this during
 * every render is cheap — you get the same underlying client back, and it
 * keeps reading the same auth cookies the server wrote.
 *
 * NOT WIRED UP, and it will not work as written. Nothing in the app imports
 * this: every Supabase call goes through the server client. Because of that,
 * `AUTH_COOKIE_OPTIONS` now sets `httpOnly: true`, and an HttpOnly cookie is
 * invisible to `document.cookie` — so this client would come back with no
 * session at all, silently, rather than failing loudly.
 *
 * Wiring the browser client up therefore means re-deciding that trade-off:
 * either give this its own options without `httpOnly` and accept that a script
 * on the page can read the refresh token, or keep the work on the server.
 */
export function createBrowserSupabase() {
  const { url, anonKey } = supabaseEnv();

  return createBrowserClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
  });
}
