"use client";

import { useActionState, useEffect } from "react";

import { stopNavigationProgress } from "./navigation-progress-control";

/**
 * Shared wiring for every form that posts to a Server Action. Results come in
 * three shapes:
 *
 *   { kind: "invalid",  field, message }  malformed input, caught HERE
 *   { kind: "rejected", field, message }  the server turned the request down
 *   { kind: "success" }                   done
 *
 * `invalid` is produced by this file and nowhere else, which is what lets a
 * form keep what the user typed: nothing went over the wire, so there is
 * nothing to throw away.
 *
 * @param onResult   the server's result. NOT called for an `invalid` — the
 *                   password forms wipe every box from here, and a typo caught
 *                   client-side must not cost the user what they typed.
 * @param onSettled  every submit that ends without navigating away, both
 *                   branches — the only callback the invalid path also reaches.
 * @param refocusRef field to focus after a rejection
 */
export function useFormAction({
  action,
  read,
  validate,
  onResult,
  onSettled,
  refocusRef,
}) {
  const [state, formAction, isPending] = useActionState(submit, null);

  /** A malformed form never reaches the network; the action re-validates. */
  async function submit(prevState, formData) {
    const invalid = validate(read(formData));

    if (invalid) {
      // Submitting armed the navigation bar, and nothing is going anywhere.
      stopNavigationProgress();
      onSettled?.();
      return { kind: "invalid", ...invalid };
    }

    const result = await action(prevState, formData);
    onResult?.(result);

    // Only reached when the action returned instead of redirecting; a redirect
    // changes the pathname, which stops the bar instead.
    stopNavigationProgress();
    onSettled?.();

    return result;
  }

  // Waits for `isPending` to clear: fields are disabled while the action is in
  // flight, and a disabled input cannot take focus.
  useEffect(() => {
    if (state?.kind === "rejected" && !isPending) {
      refocusRef?.current?.focus();
    }
  }, [state, isPending, refocusRef]);

  return { state, formAction, isPending };
}
