import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_OPTIONS, supabaseEnv } from "./env";

/** Route prefixes reachable without a session. Everything else is protected. */
const PUBLIC_ROUTES = ["/login"];

/** Where a signed-in user is sent if they open an auth-only page. */
const AUTHENTICATED_HOME = "/dashboard";

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Refreshes the Supabase auth token and enforces route protection.
 *
 * Server Components cannot write cookies, so this middleware is the only
 * place a rotated refresh token can be handed back to the browser. Without
 * it users get logged out at seemingly random moments.
 */
export async function updateSession(request) {
  const { url, anonKey } = supabaseEnv();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        supabaseResponse = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }

        // `@supabase/ssr` hands us the cache headers that must accompany a
        // response carrying auth cookies, so a CDN can never serve one
        // user's tokens to somebody else.
        for (const [header, value] of Object.entries(headers ?? {})) {
          supabaseResponse.headers.set(header, value);
        }
      },
    },
  });

  // Do not add code between `createServerClient` and `getUser()`. `getUser()`
  // revalidates the token against Supabase, which is what triggers the cookie
  // refresh above. Never use `getSession()` for authorisation on the server —
  // it reads the cookie without verifying the JWT signature.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // There is no landing page: "/" is just a doorway to wherever the visitor
  // actually belongs.
  if (pathname === "/") {
    return redirectTo(
      request,
      user ? AUTHENTICATED_HOME : "/login",
      supabaseResponse,
    );
  }

  if (!user && !isPublicRoute(pathname)) {
    return redirectTo(request, "/login", supabaseResponse);
  }

  if (user && pathname === "/login") {
    return redirectTo(request, AUTHENTICATED_HOME, supabaseResponse);
  }

  // IMPORTANT: return `supabaseResponse` as-is. If you ever swap in your own
  // response object, copy `supabaseResponse.cookies` onto it first or the
  // refreshed session is silently dropped.
  return supabaseResponse;
}

function redirectTo(request, pathname, supabaseResponse) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";

  const response = NextResponse.redirect(target);

  // Carry over any refreshed auth cookies so the redirect does not undo them.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }

  return response;
}
