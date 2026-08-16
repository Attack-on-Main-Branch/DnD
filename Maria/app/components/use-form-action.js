"use client";

import { useActionState, useEffect } from "react";

import { stopNavigationProgress } from "./navigation-progress-control";

/**
 * Shared wiring for every form in the app that posts to a Server Action, so
 * they all behave the same way and the logic exists once.
 *
 * Results come in three shapes:
 *   { kind: "invalid",  field, message }  malformed input, caught HERE
 *   { kind: "rejected", field, message }  the server turned the request down
 *   { kind: "success" }                   done
 *
 * The distinction between `invalid` and `rejected` is what lets a form decide
 * whether to keep what the user typed: nothing has gone over the wire for an
 * `invalid`, so there is no reason to throw any of it away.
 *
 * `invalid` is produced by THIS FILE and nowhere else — that is the rule, and it
 * was not being followed. Two Server Actions returned `invalid` for the same
 * server-side re-validation that the others reported as `rejected`, so the
 * contract said two different things depending on which form you read. Making
 * it strictly client-side is what keeps the sentence above true: a Server Action
 * has no form state to preserve, because the only way to reach its validator
 * without passing this one is a hand-crafted request.
 *
 * @param action     the Server Action to call once the values look well-formed
 * @param read       pulls this form's fields out of the FormData
 * @param validate   the shared rule set for those fields
 * @param onResult   called with the server's result, for the form to react to.
 *                   NOT called for an `invalid` — see the note above; the
 *                   password forms wipe every box from here, and a typo caught
 *                   client-side must not cost the user what they typed.
 * @param onSettled  called whenever a submit ends without navigating away,
 *                   both branches. This is the one that pairs with anything
 *                   armed on submit, because it is the only callback the
 *                   client-side-invalid path also reaches.
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

  /**
   * Runs in the browser. A malformed form never reaches the network; anything
   * else is handed to the Server Action, which validates again server-side.
   */
  async function submit(prevState, formData) {
    const invalid = validate(read(formData));

    if (invalid) {
      // Submitting started the navigation bar. Nothing is going anywhere, so
      // release it — reaching the end quickly is the correct outcome here.
      stopNavigationProgress();
      onSettled?.();
      return { kind: "invalid", ...invalid };
    }

    const result = await action(prevState, formData);
    onResult?.(result);

    // Only reached when the action returned instead of redirecting. A redirect
    // navigates away, and the change of pathname stops the bar instead.
    stopNavigationProgress();
    onSettled?.();

    return result;
  }

  // Focus is a DOM side effect, so it belongs in an effect rather than in the
  // action. It has to wait for `isPending` to clear: fields are disabled while
  // the action is in flight, and a disabled input cannot take focus.
  useEffect(() => {
    if (state?.kind === "rejected" && !isPending) {
      refocusRef?.current?.focus();
    }
  }, [state, isPending, refocusRef]);

  return { state, formAction, isPending };
}
