"use client";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import { useFormAction } from "@/app/components/use-form-action";

/**
 * The scaffold all three settings forms sit in. A render prop rather than a
 * `fields` array, because the fields are the part that genuinely differs.
 * Route-local on purpose: the sign-in forms have a different submit row, alert
 * placement and a mode switch, so including them makes this the wrong
 * abstraction for all five.
 */
export default function SettingsForm({
  feedbackId,
  submitLabel,
  action,
  read,
  validate,
  onResult,
  children,
}) {
  const { state, formAction, isPending } = useFormAction({
    action,
    read,
    validate,
    onResult,
  });

  const isSuccess = state?.kind === "success";

  // One spelling, used by every field in every form.
  const describedBy = state?.message ? feedbackId : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {children({ state, isPending, describedBy })}

      <FormAlert id={feedbackId} tone={isSuccess ? "success" : "error"}>
        {state?.message}
      </FormAlert>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
