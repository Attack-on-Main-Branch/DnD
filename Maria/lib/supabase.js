import { cookies } from "next/headers";
import { createServerSupabase } from "sina/supabase/server";

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

/** The signed-in user, or null. Verifies the JWT rather than trusting a cookie. */
export async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error ? null : user;
}
