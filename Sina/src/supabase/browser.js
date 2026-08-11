import { createBrowserClient } from "@supabase/ssr";

import { AUTH_COOKIE_OPTIONS, supabaseEnv } from "../env.js";

/**
 * Supabase client for the browser.
 *
 * `createBrowserClient` is a singleton by default, so calling this during
 * every render is cheap — you get the same underlying client back, and it
 * keeps reading the same auth cookies the server wrote.
 */
export function createBrowserSupabase() {
  const { url, anonKey } = supabaseEnv();

  return createBrowserClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
  });
}
