"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut, signUp as createAccount } from "sina/data/auth";
import {
  readSignInValues,
  readSignUpValues,
  validateSignIn,
  validateSignUp,
} from "sina/rules/auth";

import { logFailure, logUncovered } from "@/lib/errors";
import { createClient } from "@/lib/supabase";

/**
 * Supabase turned the credentials down. The form keeps the email so it does
 * not have to be retyped, but clears the password.
 */
function rejected(message, field = "password") {
  return { kind: "rejected", field, message };
}

/** Sina reports why; the wording lives here, where the user can see it. */
const SIGN_IN_COPY = {
  invalid_credentials: "That email and password do not match an account.",
  email_not_confirmed:
    "Confirm your email address first — check your inbox for the link.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
};

const SIGN_UP_COPY = {
  email_taken: "An account with that email already exists — try signing in.",
  weak_password: "That password is too weak. Try a longer, less common one.",
  signup_disabled: "New sign-ups are currently disabled for this project.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
};

/** Signs an existing user in and sends them to the dashboard. */
export async function logIn(_prevState, formData) {
  const credentials = readSignInValues(formData);

  // The browser checks this too, purely for speed. This is the copy that
  // counts — anything client-side can be bypassed.
  const malformed = validateSignIn(credentials);
  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();
  const { error } = await signIn(supabase, credentials);

  if (error) {
    const copy = SIGN_IN_COPY[error.reason];
    logUncovered("logIn", error, copy);
    return rejected(copy ?? "Could not sign you in. Please try again.");
  }

  // Drop any layout rendered for a signed-out visitor.
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Creates an account and signs straight in, which is what happens while
 * "Confirm email" is switched off in Authentication → Providers → Email.
 */
export async function signUp(_prevState, formData) {
  const values = readSignUpValues(formData);

  const malformed = validateSignUp(values);
  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();
  const { data, error } = await createAccount(supabase, values);

  if (error) {
    const copy = SIGN_UP_COPY[error.reason];
    logUncovered("signUp", error, copy);
    return rejected(
      copy ?? "Could not create your account. Please try again.",
      "email",
    );
  }

  if (!data.hasSession) {
    // Only reachable if email confirmation is switched back on in the Supabase
    // dashboard. Without this branch the redirect below would hand the user to
    // /dashboard, which would bounce them straight back here with no
    // explanation at all.
    return rejected(
      "Account created. Confirm your email address before signing in.",
      "email",
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Ends the session and returns the visitor to the login page. */
export async function logOut() {
  const supabase = await createClient();
  const { error } = await signOut(supabase);

  // Still redirect: whatever went wrong, staying parked on a signed-in page is
  // worse than being sent on. But a sign-out can half happen — other sessions
  // not revoked, or the client returning early with the auth cookies intact on
  // what may be a shared machine — and that is not something to find out about
  // never, so it goes to the log on the way past.
  //
  // `logFailure`, not `logUncovered`: there is no copy here to have covered it.
  // The user is told nothing either way, so every reason is worth a line.
  logFailure("logOut", error);

  revalidatePath("/", "layout");
  redirect("/login");
}
