/**
 * Signing in, signing up and signing out.
 *
 * As everywhere in this package, failures come back as a `reason` code; the
 * frontend owns the wording.
 */

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
  return { data: null, error: { reason: classify(error), detail: error.message } };
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
      // Lands in auth.users.raw_user_meta_data, which is what the Supabase
      // dashboard's "Display name" column reads.
      //
      // Note this is user-writable metadata: anyone can send whatever they
      // like here. Treat it as a label, never as an authorisation input.
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

export async function signOut(supabase) {
  await supabase.auth.signOut();
}
