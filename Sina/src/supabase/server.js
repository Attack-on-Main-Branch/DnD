import { createServerClient } from "@supabase/ssr";

import { AUTH_COOKIE_OPTIONS, supabaseEnv } from "../env.js";

/**
 * The cookie adapter is a parameter rather than an import: it is the one
 * genuinely framework-specific part, and taking it from outside keeps this
 * package free of Next. Maria supplies it from `lib/supabase.js`.
 *
 * Always a fresh client per request — a module-level singleton would share one
 * user's session with every other request the server handles.
 */
export function createServerSupabase(cookies) {
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies,
  });
}
