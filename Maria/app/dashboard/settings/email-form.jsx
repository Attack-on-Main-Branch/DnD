"use client";

import { useState } from "react";
import { readEmailValues, validateEmailChange } from "sina/rules/account";

import TextField from "@/app/components/ui/text-field";

import { updateEmail } from "./actions";
import SettingsForm from "./settings-form";

const FEEDBACK_ID = "email-feedback";

export default function EmailForm({ currentEmail }) {
  const [email, setEmail] = useState(currentEmail ?? "");
  const [currentPassword, setCurrentPassword] = useState("");

  return (
    <SettingsForm
      feedbackId={FEEDBACK_ID}
      submitLabel="Change email"
      action={updateEmail}
      read={readEmailValues}
      validate={validateEmailChange}
      // Never leave a password sitting in the box once it has been used or
      // refused, whichever happened.
      onResult={() => setCurrentPassword("")}
    >
      {({ state, isPending, describedBy }) => (
        <>
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
            aria-describedby={describedBy}
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
            aria-describedby={describedBy}
          />
        </>
      )}
    </SettingsForm>
  );
}
