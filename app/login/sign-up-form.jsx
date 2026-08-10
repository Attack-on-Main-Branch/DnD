"use client";

import { useRef, useState } from "react";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import TextField from "@/app/components/ui/text-field";

import { useFormAction } from "@/app/components/use-form-action";

import { signUp } from "./actions";
import {
  MIN_DISPLAY_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  readSignUpValues,
  validateSignUp,
} from "./validation";

const FEEDBACK_ID = "sign-up-feedback";

export default function SignUpForm({ email, onEmailChange }) {
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const passwordRef = useRef(null);

  const { state, formAction, isPending } = useFormAction({
    action: signUp,
    read: readSignUpValues,
    validate: validateSignUp,
    onResult: (result) => {
      if (result?.kind === "rejected") {
        setPassword("");
        setPasswordConfirm("");
      }
    },
    refocusRef: passwordRef,
  });

  const describedBy = state?.message ? FEEDBACK_ID : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <TextField
        label="Display name"
        name="displayName"
        type="text"
        autoComplete="nickname"
        placeholder="Elminster"
        required
        minLength={MIN_DISPLAY_NAME_LENGTH}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "displayName"}
        aria-describedby={describedBy}
      />

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "email"}
        aria-describedby={describedBy}
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        revealable
        // `new-password` is what tells a password manager to offer a generated
        // one here rather than autofilling an existing login.
        autoComplete="new-password"
        placeholder="••••••••"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "password"}
        inputRef={passwordRef}
        aria-describedby={describedBy}
      />

      <TextField
        label="Confirm password"
        name="passwordConfirm"
        type="password"
        revealable
        autoComplete="new-password"
        placeholder="••••••••"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={passwordConfirm}
        onChange={(event) => setPasswordConfirm(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "passwordConfirm"}
        aria-describedby={describedBy}
      />

      <FormAlert id={FEEDBACK_ID}>{state?.message}</FormAlert>

      <Button type="submit" fullWidth disabled={isPending} className="mt-1">
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
