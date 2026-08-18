/**
 * Account-level operations against Supabase Auth. Failures return a `reason`
 * code and leave the wording to the frontend.
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
    // Both reachable only through verifyPassword, which hits the same endpoint
    // the login form does and so can fail the same ways.
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
 * Re-authentication before an email or password change. Supabase will make both
 * on the strength of a session cookie alone, so a stolen session would be
 * enough to take an account over permanently.
 *
 * Returns a tuple rather than a boolean: "the password was wrong" and "the
 * check could not run" must not reach the user as the same sentence. Subject to
 * the login form's rate limits, and telling someone their password is wrong is
 * the reply guaranteed to make them retry into the limiter.
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
