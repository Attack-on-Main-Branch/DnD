/**
 * Reads and validates the public Supabase environment variables.
 *
 * Both values are safe to ship to the browser: the anon key only ever grants
 * what your Row Level Security policies allow. The service role key must
 * never be given a `NEXT_PUBLIC_` prefix — it bypasses RLS entirely.
 *
 * The `NEXT_PUBLIC_` names are kept even though this package is framework
 * agnostic: the browser bundle needs them inlined at build time, and that only
 * happens for variables carrying the prefix the bundler looks for.
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
 * `httpOnly` is ours too, and `@supabase/ssr` leaves it false. The comment
 * here used to justify that by saying the browser client has to read these
 * cookies — but nothing in this app instantiates a browser client. Every
 * Supabase call runs server-side: Server Components and Server Actions through
 * `next/headers`, and the proxy through the request's own cookie store. Both
 * of those see HttpOnly cookies.
 *
 * So the session was readable from `document.cookie` for a code path that does
 * not exist. Marking it HttpOnly puts the 400-day refresh token out of reach
 * of anything that ever manages to run script on the page, and costs nothing.
 *
 * Note for later: `createBrowserSupabase` in ./supabase/browser.js shares this
 * object, and a browser client cannot see an HttpOnly cookie. Wiring one up
 * means deciding this trade-off again rather than just importing it — it would
 * come back unauthenticated rather than erroring.
 */
export const AUTH_COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};
