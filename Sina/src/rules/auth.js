/**
 * Credential rules shared by the login forms and the Server Actions. One
 * definition, so the browser's copy and the check that gates access cannot
 * drift. Deliberately not a "use server" module — both sides import it.
 */

/** Supabase's own minimum is also 6, so nothing can exist below this. */
export const MIN_PASSWORD_LENGTH = 6;

export const MIN_DISPLAY_NAME_LENGTH = 3;

/**
 * Here rather than in account.js so sign-up — an unauthenticated public
 * endpoint — enforces it too. Otherwise a name created there can exceed the
 * ceiling and never afterwards be saved by the settings form.
 */
export const MAX_DISPLAY_NAME_LENGTH = 40;

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

/** Well-formed, not correct — only Supabase can answer the latter. */
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

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      field: "displayName",
      message: `Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`,
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

/** Exported so account.js calls it rather than restating the pattern. */
export function checkEmail(email) {
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
