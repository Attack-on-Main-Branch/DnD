/**
 * Credential rules shared by the login forms and the Server Actions.
 *
 * The browser runs these for instant feedback; the server runs the exact same
 * functions as the check that actually gates access. One definition, so the
 * two can never drift apart.
 *
 * Deliberately not a "use server" module — it has to be importable from both
 * the client components and the actions.
 */

/** Supabase's own minimum is also 6, so nothing can exist below this. */
export const MIN_PASSWORD_LENGTH = 6;

export const MIN_DISPLAY_NAME_LENGTH = 3;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readSignInValues(formData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export function readSignUpValues(formData) {
  return {
    displayName: String(formData.get("displayName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    passwordConfirm: String(formData.get("passwordConfirm") ?? ""),
  };
}

/**
 * @returns {{field: string, message: string} | null}
 *   `null` when the values are well-formed. This says nothing about whether
 *   they are *correct* — only Supabase can answer that.
 */
export function validateSignIn({ email, password }) {
  return checkEmail(email) ?? checkPassword(password);
}

export function validateSignUp({
  displayName,
  email,
  password,
  passwordConfirm,
}) {
  if (displayName.length < MIN_DISPLAY_NAME_LENGTH) {
    return {
      field: "displayName",
      message: `Display name must be at least ${MIN_DISPLAY_NAME_LENGTH} characters.`,
    };
  }

  const malformed = checkEmail(email) ?? checkPassword(password);
  if (malformed) {
    return malformed;
  }

  if (password !== passwordConfirm) {
    return {
      field: "passwordConfirm",
      message: "The two passwords do not match.",
    };
  }

  return null;
}

function checkEmail(email) {
  if (!email) {
    return { field: "email", message: "Enter your email address." };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { field: "email", message: "Enter a valid email address." };
  }

  return null;
}

function checkPassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      field: "password",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  return null;
}
