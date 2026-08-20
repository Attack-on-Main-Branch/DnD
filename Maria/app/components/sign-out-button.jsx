"use client";

import { useRef } from "react";

import { logOut } from "@/app/login/actions";

import { startNavigationProgress } from "./navigation-progress-control";
import Button from "./ui/button";
import { closeOut } from "./ui/panel-fold";
import { markNavDirection } from "./view-nav";

/**
 * Sign out, and stamp which way the grimoire is about to fly — the transition
 * cannot work out on its own that this is the sign-in flight in reverse.
 *
 * The page closes first: this is the one way out of the signed-in pages, so the
 * bar goes with it. The book does not — it is about to fly, and it hangs off
 * the changelog panel where nothing here can reach it.
 *
 * Nothing clears the flag: the action redirects whether or not the sign-out
 * worked, and view-nav.js has a timeout for a submit that never gets that far.
 */
export default function SignOutButton() {
  const leaving = useRef(false);

  function onSubmit(event) {
    // The second pass, once the closing has played.
    if (leaving.current) {
      return;
    }

    event.preventDefault();
    leaving.current = true;
    markNavDirection("out");
    // Cancelling the submit hides it from the loading bar, as in
    // nav-transition.jsx. The redirect stops it again on the far side.
    startNavigationProgress();

    const form = event.currentTarget;
    window.setTimeout(
      () => form.requestSubmit(),
      closeOut(document, { leavingLayout: true }),
    );
  }

  return (
    <form action={logOut} onSubmit={onSubmit}>
      <Button type="submit" variant="ghost">
        Sign out
      </Button>
    </form>
  );
}
