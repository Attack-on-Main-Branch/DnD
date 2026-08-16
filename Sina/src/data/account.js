/**
 * Account-level operations against Supabase Auth.
 *
 * As with the character queries, failures return a `reason` code and leave the
 * wording to the frontend.
 */

function classify(error) {
  switch (error.code) {
    case "email_exists":
    case "user_already_exists":
      return "email_taken";
    case "email_address_invalid":
      return "email_invalid";
    case "weak_password":
      return "weak_password";
    case "same_password":
      return "same_password";
    // Both reachable only through verifyPassword — nothing else here signs in.
    // `email_not_confirmed` is mirrored from the auth classifier on purpose:
    // re-authentication hits the same endpoint the login form does, so it can
    // come back the same way, and without a case for it a user with a correct
    // password was told it was wrong every time.
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
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

/**
 * Confirms the caller still knows the account password.
 *
 * Supabase will change an email address or a password on the strength of a
 * session cookie alone, which makes a borrowed laptop or a stolen session
 * enough to take an account over permanently. Signing in again is the check:
 * it rotates the session for the same user, which is harmless, and it fails
 * without touching anything if the password is wrong.
 *
 * Returns the same tuple as everything else here rather than a boolean, because
 * "the password was wrong" and "the check could not run" are not the same fact
 * and must not reach the user as the same sentence. This calls the same
 * password grant the login form does, so it is subject to the same rate limits
 * and can come back with the same unconfirmed-email answer — and telling
 * someone their password is wrong is the one reply guaranteed to make them
 * retry, which against a limiter is what keeps them locked out.
 */
export async function verifyPassword(supabase, { email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return error ? failure(error) : { data: true, error: null };
}

export async function setDisplayName(supabase, displayName) {
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  return error ? failure(error) : { data: true, error: null };
}

export async function setEmail(supabase, email) {
  const { data, error } = await supabase.auth.updateUser({ email });

  if (error) {
    return failure(error);
  }

  // With email confirmation switched on, Supabase parks the change until the
  // link is clicked, and `email` still reads as the old address here.
  return { data: { applied: data.user?.email === email }, error: null };
}

export async function setPassword(supabase, password) {
  const { error } = await supabase.auth.updateUser({ password });

  return error ? failure(error) : { data: true, error: null };
}
