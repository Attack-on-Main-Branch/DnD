import { cookies } from "next/headers";
import { cache } from "react";
import { createServerSupabase } from "sina/supabase/server";
import { authCouldNotAnswer } from "sina/supabase/session";

/**
 * The Next-specific half of the server-side Supabase client.
 *
 * Sina owns the client itself but takes its cookie access from outside, which
 * is what keeps the backend package free of any framework dependency. This is
 * the adapter that hands it Next's request-scoped cookie store.
 *
 * A fresh client per request, always — never hoist it into a module-level
 * singleton, or one user's session leaks into another's request.
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
 * The signed-in user — and, separately, whether asking succeeded. Verifies the
 * JWT rather than trusting a cookie.
 *
 * A tuple rather than a bare user, because `getUser()` errors for two
 * situations wanting opposite answers: a visitor with no session, which is the
 * ordinary case, and an auth service that cannot answer. Collapsing both into
 * `null` made an outage look like an expired session — every caller redirects
 * to /login, the user signs in, the next request bounces them again, and
 * nothing is logged.
 *
 * A 4xx is auth genuinely saying no — no session, expired, revoked — all of
 * which mean sign in again. Everything else is it being unable to answer.
 * `authCouldNotAnswer` owns that line, because the proxy has to draw it in
 * exactly the same place; see the note there for why status 0 is the case that
 * matters.
 */
export async function getCurrentUser(supabase) {
  const { data, error } = await supabase.auth.getUser();

  if (error && authCouldNotAnswer(error)) {
    return {
      user: null,
      error: { reason: "auth_unavailable", detail: error.message },
    };
  }

  return { user: data?.user ?? null, error: null };
}

/**
 * `getCurrentUser`, deduplicated across one request. The dashboard layout needs
 * the user for the header and every page inside it needs one for its guard;
 * without this, rendering one page verifies the same JWT twice over the network.
 *
 * `cache` is React's request-scoped memo — one render, never shared between
 * visitors. No arguments on purpose: memoising on the Supabase client would
 * never hit, since each caller builds its own.
 *
 * Server Components only. Actions keep calling `getCurrentUser(supabase)`
 * directly — they run outside the render pass, and an authorisation check is
 * the last place to add a memo whose scope needs thinking about.
 */
export const currentUser = cache(async function currentUser() {
  const supabase = await createClient();

  return getCurrentUser(supabase);
});
