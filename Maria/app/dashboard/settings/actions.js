"use server";

import { revalidatePath } from "next/cache";
import {
  setDisplayName,
  setEmail,
  setPassword,
  verifyPassword,
} from "sina/data/account";
import {
  readEmailValues,
  readPasswordValues,
  readUsernameValues,
  validateEmailChange,
  validatePasswordChange,
  validateUsername,
} from "sina/rules/account";

import { logFailure, logUncovered } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

function rejected(message, field = null) {
  return { kind: "rejected", field, message };
}

/**
 * No error means auth said no and signing in again fixes it; an error means it
 * could not answer. Local to each actions file, as `rejected` is.
 */
function sessionRejection(action, error) {
  if (!error) {
    return rejected("Your session has expired. Sign in again.");
  }

  logFailure(`${action}/auth`, error);
  return rejected(
    "Could not reach the sign-in service. Try again in a moment.",
  );
}

function success(message) {
  return { kind: "success", message };
}

/** Sina reports why; the wording lives here, where the user can see it. */
const EMAIL_COPY = {
  email_taken: "That email address is already in use.",
  email_invalid: "Supabase rejected that email address.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
};

const PASSWORD_COPY = {
  weak_password: "That password is too weak. Try a longer, less common one.",
  same_password: "The new password must differ from the current one.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
};

/**
 * Thin, but `updateUser` reaches the same rate limiter the other two do — and
 * without an entry the failure existed nowhere: generic message, no log.
 */
const USERNAME_COPY = {
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
};

/**
 * Re-authentication fails for reasons unrelated to the password, and "that
 * password is not correct" is the one reply guaranteed to make somebody retry —
 * which against a rate limit is what keeps them locked out. Only
 * `invalid_credentials` belongs on the password field.
 */
const REAUTH_COPY = {
  invalid_credentials: "That password is not correct.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
  // Same endpoint as the login form, so the same answers are possible.
  email_not_confirmed:
    "Confirm your email address first — check your inbox for the link.",
};

function reauthRejection(action, error) {
  const copy = REAUTH_COPY[error.reason];
  logUncovered(action, error, copy);

  return rejected(
    copy ?? "Could not confirm your password. Try again.",
    error.reason === "invalid_credentials" ? "currentPassword" : null,
  );
}

/** Updates the display name held in the user's metadata. */
export async function updateUsername(_prevState, formData) {
  const values = readUsernameValues(formData);

  const malformed = validateUsername(values);
  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();

  // `updateUser` does fail without a session, but as "Auth session missing!" —
  // an SDK internal with no code, so it classifies as `unknown` and the user is
  // never told to sign in again.
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("updateUsername", authError);
  }

  const { error } = await setDisplayName(supabase, values.displayName);

  if (error) {
    const copy = USERNAME_COPY[error.reason];
    logUncovered("updateUsername", error, copy);
    return rejected(copy ?? "Could not update your display name.");
  }

  // The dashboard greeting reads from this, so the whole shell is stale now.
  revalidatePath("/", "layout");
  return success("Display name updated.");
}

export async function updateEmail(_prevState, formData) {
  const values = readEmailValues(formData);

  const malformed = validateEmailChange(values);
  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("updateEmail", authError);
  }

  if (values.email.toLowerCase() === user.email?.toLowerCase()) {
    return rejected("That is already your email address.", "email");
  }

  // Changing the address that signs you in is an account-takeover lever, so it
  // takes more than a session cookie.
  const { error: reauthError } = await verifyPassword(supabase, {
    email: user.email,
    password: values.currentPassword,
  });

  if (reauthError) {
    return reauthRejection("updateEmail/reauth", reauthError);
  }

  const { data, error } = await setEmail(supabase, values.email);

  if (error) {
    const copy = EMAIL_COPY[error.reason];
    logUncovered("updateEmail", error, copy);
    return rejected(copy ?? "Could not update your email address.", "email");
  }

  revalidatePath("/", "layout");

  return data.applied
    ? success("Email address updated.")
    : success(
        `Confirmation sent to ${values.email}. The change applies once you click the link.`,
      );
}

export async function updatePassword(_prevState, formData) {
  const values = readPasswordValues(formData);

  const malformed = validatePasswordChange(values);
  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("updatePassword", authError);
  }

  const { error: reauthError } = await verifyPassword(supabase, {
    email: user.email,
    password: values.currentPassword,
  });

  if (reauthError) {
    return reauthRejection("updatePassword/reauth", reauthError);
  }

  const { error } = await setPassword(supabase, values.newPassword);

  if (error) {
    const copy = PASSWORD_COPY[error.reason];
    logUncovered("updatePassword", error, copy);
    return rejected(copy ?? "Could not update your password.", "newPassword");
  }

  return success("Password updated.");
}
