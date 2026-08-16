/**
 * Rules for the account settings forms, shared between the browser and the
 * Server Actions — same arrangement as the sign-in and character schemas.
 */

import {
  checkEmail,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "./auth.js";

/*
 * Re-exported, not redeclared. The settings forms import their bounds from this
 * module, so moving MAX_DISPLAY_NAME_LENGTH up to auth.js — where the floor and
 * the sign-up check now use it too — has to keep this door open or
 * username-form.jsx stops resolving.
 */
export {
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
};

export function readUsernameValues(formData) {
  return { displayName: String(formData.get("displayName") ?? "").trim() };
}

export function readEmailValues(formData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    currentPassword: String(formData.get("currentPassword") ?? ""),
  };
}

export function readPasswordValues(formData) {
  return {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
}

export function validateUsername({ displayName }) {
  if (displayName.length < MIN_DISPLAY_NAME_LENGTH) {
    return {
      field: "displayName",
      message: `Display name must be at least ${MIN_DISPLAY_NAME_LENGTH} characters.`,
    };
  }

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      field: "displayName",
      message: `Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`,
    };
  }

  return null;
}

export function validateEmailChange({ email, currentPassword }) {
  // Borrowed from auth.js rather than restated. The pattern was declared twice,
  // character for character, in the one layer whose whole promise is a single
  // definition — so tightening it in one place would have let a user hold an
  // address they could never have signed up with.
  const malformed = checkEmail(email);
  if (malformed) {
    return malformed;
  }

  if (currentPassword.length === 0) {
    return {
      field: "currentPassword",
      message: "Enter your current password to confirm this change.",
    };
  }

  return null;
}

export function validatePasswordChange({
  currentPassword,
  newPassword,
  confirmPassword,
}) {
  if (currentPassword.length === 0) {
    return {
      field: "currentPassword",
      message: "Enter your current password.",
    };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      field: "newPassword",
      message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  if (newPassword === currentPassword) {
    return {
      field: "newPassword",
      message: "The new password must differ from the current one.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      field: "confirmPassword",
      message: "The two passwords do not match.",
    };
  }

  return null;
}
