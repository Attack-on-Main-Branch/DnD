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

import { createClient } from "@/lib/supabase";

/**
 * The form is badly filled in — nothing was sent to Supabase. The form keeps
 * everything the user typed, including the password.
 */
function invalid({ field, message }) {
  return { kind: "invalid", field, message };
}

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
    return invalid(malformed);
  }

  const supabase = await createClient();
  const { error } = await signIn(supabase, credentials);

  if (error) {
    return rejected(
      SIGN_IN_COPY[error.reason] ??
        error.detail ??
        "Could not sign you in. Please try again.",
    );
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
    return invalid(malformed);
  }

  const supabase = await createClient();
  const { data, error } = await createAccount(supabase, values);

  if (error) {
    return rejected(
      SIGN_UP_COPY[error.reason] ??
        error.detail ??
        "Could not create your account. Please try again.",
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
  await signOut(supabase);

  revalidatePath("/", "layout");
  redirect("/login");
}
