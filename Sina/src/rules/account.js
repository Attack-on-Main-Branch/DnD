/**
 * Rules for the account settings forms, shared between the browser and the
 * Server Actions — same arrangement as the sign-in and character schemas.
 */

import { MIN_DISPLAY_NAME_LENGTH, MIN_PASSWORD_LENGTH } from "./auth.js";

export { MIN_DISPLAY_NAME_LENGTH, MIN_PASSWORD_LENGTH };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_DISPLAY_NAME_LENGTH = 40;

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
  if (!EMAIL_PATTERN.test(email)) {
    return { field: "email", message: "Enter a valid email address." };
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
