"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

import {
  readSignInValues,
  readSignUpValues,
  validateSignIn,
  validateSignUp,
} from "./validation";

/**
 * The form is badly filled in — nothing was sent to Supabase. The form keeps
 * everything the user typed, including the password.
 */
function validationFailure({ field, message }) {
  return { kind: "invalid", field, message };
}

/**
 * Supabase rejected the credentials. The form keeps the email so it does not
 * have to be retyped, but clears the password.
 */
function authFailure(message, field = "password") {
  return { kind: "rejected", field, message };
}

/** Signs an existing user in and sends them to the dashboard. */
export async function logIn(_prevState, formData) {
  const credentials = readSignInValues(formData);

  // The browser checks this too, purely for speed. This is the copy that
  // counts — anything client-side can be bypassed.
  const invalid = validateSignIn(credentials);
  if (invalid) {
    return validationFailure(invalid);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return authFailure(signInErrorMessage(error));
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

  const invalid = validateSignUp(values);
  if (invalid) {
    return validationFailure(invalid);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      // Lands in auth.users.raw_user_meta_data. The dashboard's "Display name"
      // column reads this exact key.
      //
      // Note this is user-writable metadata: anyone can send whatever they
      // like here. Treat it as a label, never as an authorisation input.
      data: { display_name: values.displayName },
    },
  });

  if (error) {
    return authFailure(signUpErrorMessage(error), "email");
  }

  if (!data.session) {
    // Only reachable if email confirmation is switched back on in the Supabase
    // dashboard. Without this branch the redirect below would hand the user to
    // /dashboard, which would bounce them straight back to /login with no
    // explanation at all.
    return authFailure(
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
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}

function signInErrorMessage(error) {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password do not match an account.";
    case "email_not_confirmed":
      return "Confirm your email address first — check your inbox for the link.";
    case "over_request_rate_limit":
      return "Too many attempts. Wait a minute and try again.";
    default:
      return error.message || "Could not sign you in. Please try again.";
  }
}

function signUpErrorMessage(error) {
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return "An account with that email already exists — try signing in.";
    case "weak_password":
      return "That password is too weak. Try a longer, less common one.";
    case "signup_disabled":
      return "New sign-ups are currently disabled for this project.";
    default:
      return error.message || "Could not create your account. Please try again.";
  }
}
