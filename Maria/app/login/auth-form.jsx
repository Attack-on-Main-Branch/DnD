"use client";

import { PANEL_CLASSES, surfaceClasses } from "@/app/components/ui/surface";
import { useState } from "react";

import Button from "@/app/components/ui/button";

import SignInForm from "./sign-in-form";
import SignUpForm from "./sign-up-form";

const VIEWS = {
  signin: {
    title: "Continue your journey",
    subtitle: "Sign in to your campaign.",
    switchPrompt: "New here?",
    switchLabel: "Create an account",
    next: "signup",
  },
  signup: {
    title: "Begin your chronicle",
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
    <div
      className={surfaceClasses({
        glow: true,
        className: PANEL_CLASSES,
      })}
    >
      {/*
        The card names itself now. It used to lean on the page's <h1>, which
        has moved into the lore column beside it — and on a phone, where the
        columns stack, that heading is a screen away by the time the form is
        on screen.
      */}
      <div className="mb-7 flex flex-col gap-1.5">
        <h2 className="font-display text-2xl font-semibold tracking-wide text-gold">
          {view.title}
        </h2>
        <p className="text-sm text-ink/60">{view.subtitle}</p>
      </div>

      {mode === "signin" ? (
        <SignInForm email={email} onEmailChange={setEmail} />
      ) : (
        <SignUpForm email={email} onEmailChange={setEmail} />
      )}

      {/*
        Inside the card now, set off by the gap above it rather than by a
        divider. It is the card's own second option rather than a note about
        the page, and out on the background it was the one piece of the
        sign-in flow with nothing behind it.
      */}
      <p className="mt-7 text-center text-sm text-ink/60">
        {view.switchPrompt}{" "}
        <Button variant="link" onClick={() => setMode(view.next)}>
          {view.switchLabel}
        </Button>
      </p>
    </div>
  );
}
