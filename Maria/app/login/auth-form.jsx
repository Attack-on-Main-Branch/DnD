"use client";

import { PANEL_CLASSES, surfaceClasses } from "@/app/components/ui/surface";
import { useLayoutEffect, useRef, useState } from "react";

import Button from "@/app/components/ui/button";
import { closeOut, reopen } from "@/app/components/ui/panel-fold";

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

const MORPH_MS = 300;

export default function AuthForm() {
  const [mode, setMode] = useState("signin");

  // Lifted out of both forms so switching views does not make the user retype
  // an email they have already entered. Passwords deliberately do not carry
  // over — swapping views unmounts the form and takes its secrets with it,
  // along with any stale error from the view being left behind.
  const [email, setEmail] = useState("");

  const bodyRef = useRef(null);
  // Measured in the click, not the effect: an error or a reveal can change the
  // height between renders, and the one on screen is the one to travel from.
  const fromHeight = useRef(null);

  const view = VIEWS[mode];

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const from = fromHeight.current;
    fromHeight.current = null;

    if (!body || from === null) {
      return;
    }

    const to = body.getBoundingClientRect().height;

    if (
      to === from ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const easing =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--ease-tray")
        .trim() || "ease-out";

    body.style.overflow = "hidden";
    body
      .animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration: MORPH_MS,
        easing,
      })
      .finished.catch(() => {})
      .then(() => {
        body.style.overflow = "";
      });
  }, [mode]);

  // Both halves of the page leave together. The lore column is a sibling
  // rendered on the server, so its glass is found rather than passed —
  // view-nav.js reaches for the grimoire the same way.
  const leave = () => closeOut(document);
  const stay = () => reopen();

  function switchMode() {
    fromHeight.current =
      bodyRef.current?.getBoundingClientRect().height ?? null;
    setMode(view.next);
  }

  return (
    <div
      data-fold
      className={surfaceClasses({
        glow: true,
        className: `panel-in ${PANEL_CLASSES}`,
      })}
    >
      {/* One element child, which is what the reveal fades and lifts. */}
      <div>
        {/*
          The card names itself now. It used to lean on the page's <h1>, which
          has moved into the lore column beside it — and on a phone, where the
          columns stack, that heading is a screen away by the time the form is
          on screen.
        */}
        {/* Keyed on the mode, so the new wording arrives as a fresh element. */}
        <div
          key={mode}
          className="mb-7 flex flex-col gap-1.5 motion-safe:animate-[auth-text-in_180ms_ease-out]"
        >
          <h2 className="font-display text-2xl font-semibold tracking-wide text-gold">
            {view.title}
          </h2>
          <p className="text-sm text-ink/60">{view.subtitle}</p>
        </div>

        <div ref={bodyRef}>
          {mode === "signin" ? (
            <SignInForm
              email={email}
              onEmailChange={setEmail}
              onLeaving={leave}
              onStaying={stay}
            />
          ) : (
            <SignUpForm
              email={email}
              onEmailChange={setEmail}
              onLeaving={leave}
              onStaying={stay}
            />
          )}
        </div>

        {/*
          Inside the card now, set off by the gap above it rather than by a
          divider. It is the card's own second option rather than a note about
          the page, and out on the background it was the one piece of the
          sign-in flow with nothing behind it.
        */}
        <p className="mt-7 text-center text-sm text-ink/60">
          {view.switchPrompt}{" "}
          <Button variant="link" onClick={switchMode}>
            {view.switchLabel}
          </Button>
        </p>
      </div>
    </div>
  );
}
