/**
 * Which routes a signed-out visitor may reach — the access policy itself,
 * kept here with the rest of the backend rather than in the routing glue that
 * happens to enforce it.
 */
const PUBLIC_ROUTES = ["/login"];

/** Where a signed-in visitor is sent if they open an auth-only page. */
export const AUTHENTICATED_HOME = "/dashboard";

/** Where a signed-out visitor is sent when they reach for something private. */
export const SIGNED_OUT_HOME = "/login";

export function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Whether an auth error means the service could not answer, as opposed to
 * answering "no".
 *
 * One function rather than a comparison written out at each call site, because
 * two layers ask the same question and the answers must agree: the proxy
 * decides whether to redirect, the pages decide what to render, and if the
 * proxy says "signed out" the page never runs to disagree.
 *
 * Status 0 is the subtle one. `@supabase/auth-js` reports every transport
 * failure — DNS, refused connection, reset, TLS, timeout, abort — as an
 * `AuthRetryableFetchError` carrying status 0, not as an error with no status
 * (lib/fetch.js throws `(message, 0)` on both of its failure paths). A plain
 * `status < 500` therefore counted the most common outage as auth saying no,
 * which is exactly backwards. Anything without a number is unknown and treated
 * the same way; only a real 4xx is auth genuinely answering.
 */
export function authCouldNotAnswer(error) {
  if (!error) {
    return false;
  }

  const status = error.status;

  return typeof status !== "number" || status === 0 || status >= 500;
}

/**
 * Decides where a request should go, given who is making it.
 *
 * Returns a pathname to redirect to, or `null` to let the request through.
 * Pure and framework-free, so the proxy that calls it only has to deal with
 * request and response plumbing.
 *
 * @param authUnavailable  true when we could not find out who is asking — the
 *                         auth service did not answer. Distinct from
 *                         `isSignedIn: false`, which means it answered no.
 */
export function resolveRedirect({
  pathname,
  isSignedIn,
  authUnavailable = false,
}) {
  // There is no landing page: "/" is a doorway to wherever the visitor belongs.
  // Somebody has to be sent somewhere even when we cannot tell who they are,
  // and the sign-in page is the honest guess — letting this one through would
  // only produce a 404.
  if (pathname === "/") {
    return isSignedIn ? AUTHENTICATED_HOME : SIGNED_OUT_HOME;
  }

  // We do not know. Sending them to /login would be a diagnosis, and the wrong
  // one: they would sign in, come back, and be bounced again, with nothing
  // logged — the loop this whole distinction exists to break. Let the request
  // through instead. Every protected page verifies for itself and throws into
  // its error boundary, which can say what is actually wrong; a page that finds
  // no user still redirects here on its own.
  if (authUnavailable) {
    return null;
  }

  if (!isSignedIn && !isPublicRoute(pathname)) {
    return SIGNED_OUT_HOME;
  }

  if (isSignedIn && pathname === SIGNED_OUT_HOME) {
    return AUTHENTICATED_HOME;
  }

  return null;
}
