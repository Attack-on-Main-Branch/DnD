/** The access policy itself, kept with the backend rather than the routing glue. */
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
 * Whether auth could not answer, as opposed to answering "no". One function
 * because two layers ask it and must agree: if the proxy says "signed out" the
 * page never runs to disagree.
 *
 * Status 0 is the subtle case. `@supabase/auth-js` reports every transport
 * failure — DNS, refused, reset, TLS, timeout, abort — as an
 * `AuthRetryableFetchError` carrying status 0, so a plain `status < 500` counts
 * the most common outage as auth saying no. Only a real 4xx is an answer.
 */
export function authCouldNotAnswer(error) {
  if (!error) {
    return false;
  }

  const status = error.status;

  return typeof status !== "number" || status === 0 || status >= 500;
}

/**
 * A pathname to redirect to, or `null` to let the request through. Pure, so the
 * proxy only deals with plumbing.
 *
 * `authUnavailable` means we could not find out who is asking — distinct from
 * `isSignedIn: false`, which means auth answered no.
 */
export function resolveRedirect({
  pathname,
  isSignedIn,
  authUnavailable = false,
}) {
  // No landing page: "/" is a doorway. Letting it through would only 404, so
  // even an unidentified visitor is sent somewhere.
  if (pathname === "/") {
    return isSignedIn ? AUTHENTICATED_HOME : SIGNED_OUT_HOME;
  }

  // Sending them to /login would be a diagnosis, and the wrong one: they would
  // sign in, come back, and be bounced again. Let the request through — the
  // page verifies for itself and throws into its error boundary.
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
