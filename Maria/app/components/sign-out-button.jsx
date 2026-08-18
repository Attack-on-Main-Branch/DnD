"use client";

import { logOut } from "@/app/login/actions";

import Button from "./ui/button";
import { markNavDirection } from "./view-nav";

/**
 * Sign out, and stamp which way the grimoire is about to fly — a client
 * component only for that second job, since the transition cannot work out on
 * its own that this is the sign-in flight in reverse.
 *
 * Nothing clears the flag: the action redirects, and view-nav.js has a timeout
 * for the case where the sign-out fails and this page is still here.
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
