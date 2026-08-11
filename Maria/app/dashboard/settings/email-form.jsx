"use client";

import { useState } from "react";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import TextField from "@/app/components/ui/text-field";
import { useFormAction } from "@/app/components/use-form-action";

import { updateEmail } from "./actions";
import { readEmailValues, validateEmailChange } from "sina/rules/account";

const FEEDBACK_ID = "email-feedback";

export default function EmailForm({ currentEmail }) {
  const [email, setEmail] = useState(currentEmail ?? "");
  const [currentPassword, setCurrentPassword] = useState("");

  const { state, formAction, isPending } = useFormAction({
    action: updateEmail,
    read: readEmailValues,
    validate: validateEmailChange,
    // Never leave a password sitting in the box once it has been used or
    // refused, whichever happened.
    onResult: () => setCurrentPassword(""),
  });

  const isSuccess = state?.kind === "success";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <TextField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "email"}
        aria-describedby={state?.message ? FEEDBACK_ID : undefined}
      />

      <TextField
        label="Current password"
        name="currentPassword"
        type="password"
        revealable
        autoComplete="current-password"
        placeholder="••••••••"
        required
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "currentPassword"}
        aria-describedby={state?.message ? FEEDBACK_ID : undefined}
      />

      <FormAlert id={FEEDBACK_ID} tone={isSuccess ? "success" : "error"}>
        {state?.message}
      </FormAlert>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Change email"}
        </Button>
      </div>
    </form>
  );
}
