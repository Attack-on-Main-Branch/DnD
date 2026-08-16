"use client";

import { useState } from "react";
import {
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  readUsernameValues,
  validateUsername,
} from "sina/rules/account";

import TextField from "@/app/components/ui/text-field";

import { updateUsername } from "./actions";
import SettingsForm from "./settings-form";

const FEEDBACK_ID = "username-feedback";

export default function UsernameForm({ currentDisplayName }) {
  const [displayName, setDisplayName] = useState(currentDisplayName ?? "");

  return (
    <SettingsForm
      feedbackId={FEEDBACK_ID}
      submitLabel="Save display name"
      action={updateUsername}
      read={readUsernameValues}
      validate={validateUsername}
    >
      {({ state, isPending, describedBy }) => (
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
          aria-describedby={describedBy}
        />
      )}
    </SettingsForm>
  );
}
