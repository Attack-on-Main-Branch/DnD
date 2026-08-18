import { NextResponse } from "next/server";
import { createServerSupabase } from "sina/supabase/server";
import { authCouldNotAnswer, resolveRedirect } from "sina/supabase/session";

/**
 * Refreshes the Supabase auth token and enforces route protection. Server
 * Components cannot write cookies, so this is the only place a rotated refresh
 * token gets back to the browser — without it, users log out at random.
 *
 * Next 16 renamed the `middleware` convention to `proxy`. The function must be
 * the default export, or a named export matching the file name.
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

      // `@supabase/ssr` supplies the cache headers a response carrying auth
      // cookies needs, so a CDN cannot serve one user's tokens to another.
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

  // The error matters as much as the user: `getUser()` returns rather than
  // throws when auth is unreachable, so discarding it turned every outage into
  // "signed out" — decided here, before any page could disagree.
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
