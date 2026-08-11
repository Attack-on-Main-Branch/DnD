"use client";

import { useState } from "react";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import TextField from "@/app/components/ui/text-field";
import { useFormAction } from "@/app/components/use-form-action";

import { updateUsername } from "./actions";
import {
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  readUsernameValues,
  validateUsername,
} from "sina/rules/account";

const FEEDBACK_ID = "username-feedback";

export default function UsernameForm({ currentDisplayName }) {
  const [displayName, setDisplayName] = useState(currentDisplayName ?? "");

  const { state, formAction, isPending } = useFormAction({
    action: updateUsername,
    read: readUsernameValues,
    validate: validateUsername,
  });

  const isSuccess = state?.kind === "success";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <TextField
        label="Display name"
        name="displayName"
        type="text"
        autoComplete="nickname"
        required
        minLength={MIN_DISPLAY_NAME_LENGTH}
        maxLength={MAX_DISPLAY_NAME_LENGTH}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "displayName"}
        aria-describedby={state?.message ? FEEDBACK_ID : undefined}
      />

      <FormAlert id={FEEDBACK_ID} tone={isSuccess ? "success" : "error"}>
        {state?.message}
      </FormAlert>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save display name"}
        </Button>
      </div>
    </form>
  );
}
