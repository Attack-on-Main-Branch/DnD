/**
 * Both values are safe to ship to the browser: the anon key only grants what
 * RLS allows. The service role key must never carry a `NEXT_PUBLIC_` prefix —
 * it bypasses RLS entirely. The prefix stays despite this package being
 * framework-agnostic, because it is what makes the bundler inline the values.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in Maria/.env.local for local " +
        "development, and in your Vercel project's Environment Variables " +
        "for deployments.",
    );
  }

  return { url, anonKey };
}

/**
 * Cookie attributes for the auth cookies, applied by every client.
 *
 * `@supabase/ssr` supplies `path`, `sameSite` and a 400-day `maxAge`, but never
 * `secure` or `httpOnly` — both are ours. `secure` is off in development
 * because localhost is HTTP and the cookie would be dropped. `httpOnly` keeps
 * the 400-day refresh token away from any script that runs on the page; every
 * Supabase call here is server-side, so nothing needs to read it.
 *
 * Note: `createBrowserSupabase` shares this object and cannot see an HttpOnly
 * cookie. Wiring one up means re-deciding this, not just importing it — it
 * would come back unauthenticated rather than erroring.
 */
export const AUTH_COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};
