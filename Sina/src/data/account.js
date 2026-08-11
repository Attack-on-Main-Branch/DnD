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
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rate_limited";
    default:
      return "unknown";
  }
}

function failure(error) {
  return { data: null, error: { reason: classify(error), detail: error.message } };
}

/**
 * Confirms the caller still knows the account password.
 *
 * Supabase will change an email address or a password on the strength of a
 * session cookie alone, which makes a borrowed laptop or a stolen session
 * enough to take an account over permanently. Signing in again is the check:
 * it rotates the session for the same user, which is harmless, and it fails
 * without touching anything if the password is wrong.
 */
export async function verifyPassword(supabase, { email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return !error;
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
