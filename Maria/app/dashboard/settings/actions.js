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

import { createClient, getCurrentUser } from "@/lib/supabase";

function rejected(message, field = null) {
  return { kind: "rejected", field, message };
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
};

/** Updates the display name held in the user's metadata. */
export async function updateUsername(_prevState, formData) {
  const values = readUsernameValues(formData);

  const malformed = validateUsername(values);
  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();
  const { error } = await setDisplayName(supabase, values.displayName);

  if (error) {
    return rejected(error.detail ?? "Could not update your display name.");
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
  const user = await getCurrentUser(supabase);

  if (!user) {
    return rejected("Your session has expired. Sign in again.");
  }

  if (values.email.toLowerCase() === user.email?.toLowerCase()) {
    return rejected("That is already your email address.", "email");
  }

  // Changing the address that signs you in is an account-takeover lever, so it
  // takes more than a session cookie.
  const confirmed = await verifyPassword(supabase, {
    email: user.email,
    password: values.currentPassword,
  });

  if (!confirmed) {
    return rejected("That password is not correct.", "currentPassword");
  }

  const { data, error } = await setEmail(supabase, values.email);

  if (error) {
    return rejected(
      EMAIL_COPY[error.reason] ??
        error.detail ??
        "Could not update your email address.",
      "email",
    );
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
  const user = await getCurrentUser(supabase);

  if (!user) {
    return rejected("Your session has expired. Sign in again.");
  }

  const confirmed = await verifyPassword(supabase, {
    email: user.email,
    password: values.currentPassword,
  });

  if (!confirmed) {
    return rejected("That password is not correct.", "currentPassword");
  }

  const { error } = await setPassword(supabase, values.newPassword);

  if (error) {
    return rejected(
      PASSWORD_COPY[error.reason] ??
        error.detail ??
        "Could not update your password.",
      "newPassword",
    );
  }

  return success("Password updated.");
}
