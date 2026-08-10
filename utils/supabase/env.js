/**
 * Reads and validates the public Supabase environment variables.
 *
 * Both values are safe to ship to the browser: the anon key only ever grants
 * what your Row Level Security policies allow. The service role key must
 * never be given a `NEXT_PUBLIC_` prefix — it bypasses RLS entirely.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local for local development, " +
        "and in your Vercel project's Environment Variables for deployments.",
    );
  }

  return { url, anonKey };
}

/**
 * Cookie attributes for the Supabase auth cookies, applied by every client.
 *
 * `@supabase/ssr` already defaults to `path: "/"`, `sameSite: "lax"` and a
 * 400-day `maxAge` — that `maxAge` is what keeps a signed-in user signed in
 * after they close the browser, and the library force-resets it on every
 * write, so it cannot be lost here.
 *
 * What the library never sets is `secure`, so we do. Over HTTPS the session
 * cookie must not be sent on a plain HTTP request; left off in development
 * because localhost is served over HTTP and the cookie would be dropped.
 *
 * `httpOnly` stays false by design: `createBrowserClient` has to read these
 * cookies for any client-side Supabase call to be authenticated. The trade-off
 * is that XSS could read a token, which is why the tokens are short-lived and
 * every server-side check goes through `getUser()`.
 */
export const AUTH_COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === "production",
};
