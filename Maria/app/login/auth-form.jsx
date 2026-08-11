"use client";

import { useState } from "react";

import Button from "@/app/components/ui/button";

import SignInForm from "./sign-in-form";
import SignUpForm from "./sign-up-form";

const VIEWS = {
  signin: {
    subtitle: "Sign in to your campaign.",
    switchPrompt: "New here?",
    switchLabel: "Create an account",
    next: "signup",
  },
  signup: {
    subtitle: "Create an account to start a campaign.",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    next: "signin",
  },
};

export default function AuthForm() {
  const [mode, setMode] = useState("signin");

  // Lifted out of both forms so switching views does not make the user retype
  // an email they have already entered. Passwords deliberately do not carry
  // over — swapping views unmounts the form and takes its secrets with it,
  // along with any stale error from the view being left behind.
  const [email, setEmail] = useState("");

  const view = VIEWS[mode];

  return (
    <>
      <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
        {view.subtitle}
      </p>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-white/5">
        {mode === "signin" ? (
          <SignInForm email={email} onEmailChange={setEmail} />
        ) : (
          <SignUpForm email={email} onEmailChange={setEmail} />
        )}
      </div>

      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        {view.switchPrompt}{" "}
        <Button variant="link" onClick={() => setMode(view.next)}>
          {view.switchLabel}
        </Button>
      </p>
    </>
  );
}
