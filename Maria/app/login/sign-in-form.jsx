"use client";

import { useRef, useState } from "react";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import TextField from "@/app/components/ui/text-field";

import { useFormAction } from "@/app/components/use-form-action";
import { clearNavDirection, markNavDirection } from "@/app/components/view-nav";

import { logIn } from "./actions";
import {
  MIN_PASSWORD_LENGTH,
  readSignInValues,
  validateSignIn,
} from "sina/rules/auth";

const FEEDBACK_ID = "sign-in-feedback";

export default function SignInForm({ email, onEmailChange }) {
  const [password, setPassword] = useState("");
  const passwordRef = useRef(null);

  const { state, formAction, isPending } = useFormAction({
    action: logIn,
    read: readSignInValues,
    validate: validateSignIn,
    // Settling without navigating means nothing is flying, so let the book go
    // back to drifting. This has to hang off `onSettled` rather than
    // `onResult`: a submit caught by client-side validation never reaches the
    // server and so never produces a result, and that is the most common way
    // to press this button without leaving the page. Hung off `onResult`, a
    // mistyped password left the book frozen until the 6s backstop.
    onSettled: clearNavDirection,
    onResult: (result) => {
      if (result?.kind === "rejected") {
        setPassword("");
      }
    },
    refocusRef: passwordRef,
  });

  const describedBy = state?.message ? FEEDBACK_ID : undefined;

  return (
    <form
      action={formAction}
      noValidate
      // Stamped before the action runs, so the book is already settling by the
      // time the redirect comes back and the transition captures it.
      onSubmit={() => markNavDirection("in")}
      className="flex flex-col gap-5"
    >
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
        autoComplete="current-password"
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

      <FormAlert id={FEEDBACK_ID}>{state?.message}</FormAlert>

      <Button
        type="submit"
        fullWidth
        disabled={isPending}
        className="mt-1 motion-safe:animate-[auth-text-in_180ms_ease-out]"
      >
        {isPending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
