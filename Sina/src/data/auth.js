/** Signing in, signing up and signing out. Failures come back as `reason` codes. */

function classify(error) {
  switch (error.code) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "user_already_exists":
    case "email_exists":
      return "email_taken";
    case "weak_password":
      return "weak_password";
    case "signup_disabled":
      return "signup_disabled";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rate_limited";
    default:
      return "unknown";
  }
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

export async function signIn(supabase, { email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return error ? failure(error) : { data: true, error: null };
}

export async function signUp(supabase, { email, password, displayName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Lands in auth.users.raw_user_meta_data, which is user-writable: treat
      // it as a label, never as an authorisation input.
      data: { display_name: displayName },
    },
  });

  if (error) {
    return failure(error);
  }

  // No session means email confirmation is switched on and the account is
  // parked until the link is clicked.
  return { data: { hasSession: Boolean(data.session) }, error: null };
}

/**
 * The error is returned rather than swallowed: a failed sign-out can leave
 * other sessions un-revoked, or the auth cookies intact on a shared machine.
 * Callers should redirect either way, but must not stay silent about it.
 */
export async function signOut(supabase) {
  const { error } = await supabase.auth.signOut();

  return error ? failure(error) : { data: true, error: null };
}

/**
 * The current session's access token, for the Realtime socket and nothing else.
 *
 * The one deliberate `getSession()` in the project, and it is not an
 * authorisation decision: callers verify with `getUser()` first and only then
 * ask for the token to hand over. `getSession()` reads the cookie without
 * checking the signature, which is exactly why it must never be the thing that
 * decides whether somebody is signed in — but it is the only way to reach the
 * token itself, and Supabase verifies that token again at the other end.
 *
 * `null` rather than an error when there is no session: a page with no socket
 * is a degraded page, not a broken one.
 */
export async function sessionAccessToken(supabase) {
  const { data, error } = await supabase.auth.getSession();

  return error
    ? failure(error)
    : { data: data?.session?.access_token ?? null, error: null };
}
