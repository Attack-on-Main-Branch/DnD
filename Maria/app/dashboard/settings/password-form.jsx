"use client";

import { useState } from "react";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import TextField from "@/app/components/ui/text-field";
import { useFormAction } from "@/app/components/use-form-action";

import { updatePassword } from "./actions";
import {
  MIN_PASSWORD_LENGTH,
  readPasswordValues,
  validatePasswordChange,
} from "sina/rules/account";

const FEEDBACK_ID = "password-feedback";

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { state, formAction, isPending } = useFormAction({
    action: updatePassword,
    read: readPasswordValues,
    validate: validatePasswordChange,
    // Clear every box once the server has spoken, whichever way it went: on
    // success they are spent, on rejection they should not be reused blindly.
    onResult: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
  });

  const isSuccess = state?.kind === "success";
  const describedBy = state?.message ? FEEDBACK_ID : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
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
        aria-describedby={describedBy}
      />

      <TextField
        label="New password"
        name="newPassword"
        type="password"
        revealable
        autoComplete="new-password"
        placeholder="••••••••"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "newPassword"}
        aria-describedby={describedBy}
      />

      <TextField
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        revealable
        autoComplete="new-password"
        placeholder="••••••••"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "confirmPassword"}
        aria-describedby={describedBy}
      />

      <FormAlert id={FEEDBACK_ID} tone={isSuccess ? "success" : "error"}>
        {state?.message}
      </FormAlert>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
