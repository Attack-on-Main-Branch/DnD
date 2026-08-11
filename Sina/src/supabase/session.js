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
 * Decides where a request should go, given who is making it.
 *
 * Returns a pathname to redirect to, or `null` to let the request through.
 * Pure and framework-free, so the proxy that calls it only has to deal with
 * request and response plumbing.
 */
export function resolveRedirect({ pathname, isSignedIn }) {
  // There is no landing page: "/" is a doorway to wherever the visitor belongs.
  if (pathname === "/") {
    return isSignedIn ? AUTHENTICATED_HOME : SIGNED_OUT_HOME;
  }

  if (!isSignedIn && !isPublicRoute(pathname)) {
    return SIGNED_OUT_HOME;
  }

  if (isSignedIn && pathname === SIGNED_OUT_HOME) {
    return AUTHENTICATED_HOME;
  }

  return null;
}
