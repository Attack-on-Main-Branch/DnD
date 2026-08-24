import { logFailure } from "@/lib/errors";

/**
 * The shape every form action answers with. Not thrown: `useActionState` hands
 * this straight back to the form, which re-renders with the message and keeps
 * what was typed. `field` names the input to mark, or null for the whole sheet.
 */
export function rejected(message, field = null) {
  return { kind: "rejected", field, message };
}

/**
 * The one answer all of them give when the session is the problem. No error
 * means auth said no and signing in again fixes it; an error means it could not
 * answer, and a login form would only repeat the failure.
 */
export function sessionRejection(action, error) {
  if (!error) {
    return rejected("Your session has expired. Sign in again.");
  }

  logFailure(`${action}/auth`, error);
  return rejected(
    "Could not reach the sign-in service. Try again in a moment.",
  );
}
