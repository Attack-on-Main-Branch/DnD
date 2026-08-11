import { createServerClient } from "@supabase/ssr";

import { AUTH_COOKIE_OPTIONS, supabaseEnv } from "../env.js";

/**
 * Supabase client for server-side work, built around a cookie adapter the
 * caller supplies.
 *
 * The adapter is a parameter rather than an import on purpose: reading and
 * writing cookies is the one genuinely framework-specific part of this, and
 * taking it from outside keeps this package free of any dependency on Next.
 * The frontend passes the adapter in from `Maria/lib/supabase.js`.
 *
 * Always build a fresh client per request. Hoisting one into a module-level
 * singleton would share a user's session with every other request the server
 * handles.
 *
 * @param cookies {{ getAll: () => Array, setAll?: (cookies: Array, headers: object) => void }}
 */
export function createServerSupabase(cookies) {
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies,
  });
}
