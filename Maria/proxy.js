import { NextResponse } from "next/server";
import { createServerSupabase } from "sina/supabase/server";
import { authCouldNotAnswer, resolveRedirect } from "sina/supabase/session";

/**
 * Refreshes the Supabase auth token and enforces route protection.
 *
 * Server Components cannot write cookies, so this is the only place a rotated
 * refresh token can be handed back to the browser. Without it, users get
 * logged out at seemingly random moments.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy`; the old name
 * still works but warns on every build. The function must be the default
 * export, or a named export matching the file name.
 */
export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerSupabase({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet, headers) {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }

      response = NextResponse.next({ request });

      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }

      // `@supabase/ssr` hands us the cache headers that must accompany a
      // response carrying auth cookies, so a CDN can never serve one user's
      // tokens to somebody else.
      for (const [header, value] of Object.entries(headers ?? {})) {
        response.headers.set(header, value);
      }
    },
  });

  // Do not add code between `createServerSupabase` and `getUser()`. `getUser()`
  // revalidates the token against Supabase, which is what triggers the cookie
  // refresh above. Never use `getSession()` for authorisation on the server —
  // it reads the cookie without verifying the JWT signature.
  const { data, error } = await supabase.auth.getUser();

  // The error matters as much as the user. `getUser()` returns rather than
  // throws when auth cannot be reached, so discarding it here turned every
  // outage into "signed out" — and since this runs before every page and every
  // Server Action, it decided the question before any of the handling further
  // in could be reached. That is the layer the loop lived in.
  const destination = resolveRedirect({
    pathname: request.nextUrl.pathname,
    isSignedIn: Boolean(data?.user),
    authUnavailable: authCouldNotAnswer(error),
  });

  if (destination) {
    return redirectTo(request, destination, response);
  }

  // IMPORTANT: return `response` as-is. If you ever swap in your own response
  // object, copy `response.cookies` onto it first or the refreshed session is
  // silently dropped.
  return response;
}

function redirectTo(request, pathname, response) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";

  const redirect = NextResponse.redirect(target);

  // Carry over any refreshed auth cookies so the redirect does not undo them.
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }

  return redirect;
}

export const config = {
  matcher: [
    /*
     * Run on every request except static assets, so the Supabase auth token
     * is refreshed before any page, action or route handler executes.
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
