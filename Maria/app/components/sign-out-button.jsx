"use client";

import { logOut } from "@/app/login/actions";

import Button from "./ui/button";
import { markNavDirection } from "./view-nav";

/**
 * Sign out, and tell the page which way the grimoire is about to fly.
 *
 * A client component only for that second job. Signing out is the sign-in
 * flight in reverse — the book leaves the dashboard's corner for the login
 * page — so it has to turn the other way, and the transition has no way of
 * working that out for itself. Stamping the direction here, before the action
 * runs, is what tells it.
 *
 * The action redirects on success, so nothing clears the flag afterwards: this
 * page is gone by then, and view-nav.js has a timeout for the case where the
 * sign-out fails and it is not.
 */
export default function SignOutButton() {
  return (
    <form action={logOut} onSubmit={() => markNavDirection("out")}>
      <Button type="submit" variant="ghost">
        Sign out
      </Button>
    </form>
  );
}
