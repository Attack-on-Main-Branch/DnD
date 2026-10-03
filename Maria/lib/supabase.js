import { cookies } from "next/headers";
import { cache } from "react";
import { createServerSupabase } from "sina/supabase/server";
import { authCouldNotAnswer } from "sina/supabase/session";

/**
 * The Next-specific half of the server-side Supabase client: the adapter that
 * hands Sina its request-scoped cookie store.
 *
 * A fresh client per request, always — a module-level singleton leaks one
 * user's session into another's request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerSupabase({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Server Components are not allowed to write cookies. Safe to ignore:
        // the proxy refreshes the session on every request, so the browser
        // still receives the rotated tokens.
      }
    },
  });
}

/**
 * The signed-in user, and separately whether asking succeeded. Verifies the JWT
 * rather than trusting a cookie.
 *
 * `getClaims()` rather than `getUser()`: the project signs with an asymmetric
 * key, so the signature is checked here against the cached JWKS instead of by a
 * round trip to Auth on every page, Action and table read. That is the same
 * check PostgREST makes before RLS sees a query. A symmetric key makes
 * `getClaims()` fall back to `getUser()` by itself.
 *
 * The cost is freshness: the claims are what the account was when the token
 * was minted. `setDisplayName` refreshes the session for that reason, and
 * anything that needs the account as Auth holds it now uses `getAccount`.
 *
 * A tuple because the lookup errors for two situations wanting opposite
 * answers: no session, and auth unable to answer. Collapsing both into `null`
 * made an outage look like an expired session, so every caller redirected to
 * /login and bounced the user straight back. `authCouldNotAnswer` owns that
 * line, since the proxy must draw it in exactly the same place.
 */
export async function getCurrentUser(supabase) {
  const { data, error } = await supabase.auth.getClaims();

  if (error && authCouldNotAnswer(error)) {
    return unavailable(error);
  }

  const claims = data?.claims;

  return {
    user: claims
      ? {
          id: claims.sub,
          email: claims.email,
          user_metadata: claims.user_metadata ?? {},
        }
      : null,
    error: null,
  };
}

/**
 * `getCurrentUser`, asked of Auth itself. For the settings page and its
 * Actions, which show and re-authenticate against the email and name as they
 * stand — a change confirmed by link does not reach the token until it turns
 * over.
 */
export async function getAccount(supabase) {
  const { data, error } = await supabase.auth.getUser();

  if (error && authCouldNotAnswer(error)) {
    return unavailable(error);
  }

  return { user: data?.user ?? null, error: null };
}

function unavailable(error) {
  return {
    user: null,
    error: { reason: "auth_unavailable", detail: error.message },
  };
}

/**
 * `getCurrentUser`, deduplicated across one request — the layout and the page
 * inside it would otherwise verify the same JWT twice, and the first check of a
 * fresh server instance fetches the signing keys.
 *
 * `cache` is React's request-scoped memo, never shared between visitors. No
 * arguments on purpose: memoising on the client would never hit, since each
 * caller builds its own. Server Components only — Actions run outside the
 * render pass and keep calling `getCurrentUser(supabase)` directly.
 */
export const currentUser = cache(async function currentUser() {
  const supabase = await createClient();

  return getCurrentUser(supabase);
});
