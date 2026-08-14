import Link from "next/link";

import { logOut } from "@/app/login/actions";

import Button, { buttonClasses } from "./ui/button";
import { FADED_RULE_CLASSES, surfaceClasses } from "./ui/surface";

/**
 * The application bar: branding on the left, the signed-in user and their
 * controls on the right.
 *
 * One of the app's four glass surfaces. Note that `backdrop-filter` makes an
 * element a containing block for absolutely and fixed positioned descendants,
 * so anything that needs to hang below this bar — a menu, a popover — has to
 * be portalled out or use the top layer, or it will anchor to this 4rem strip
 * instead of the viewport.
 */
export default function SiteHeader({ displayName, email }) {
  const initials = toInitials(displayName ?? email ?? "?");

  return (
    <header className="sticky top-0 z-20">
      <div className={surfaceClasses({ className: "border-x-0 border-t-0" })}>
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="font-display text-2xl font-semibold tracking-wide text-ink drop-shadow-[0_0_18px_rgba(255,223,156,0.35)] transition-colors hover:text-gold sm:text-3xl"
          >
            Grimoire Tales
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/*
              Plain rather than glass: at this height the blur kernel is wider
              than the pill, so it would render as a flat tint anyway — and
              nesting a filtered element inside the filtered header would give
              it nothing to sample.
            */}
            <div
              className={surfaceClasses({
                variant: "plain",
                className:
                  "hidden items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 sm:flex",
              })}
            >
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full border border-gold/30 bg-gold/15 font-display text-base font-semibold text-gold"
              >
                {initials}
              </span>

              <span className="min-w-0 leading-tight">
                <span className="block truncate font-display text-sm font-medium tracking-wide text-gold">
                  {displayName ?? "Adventurer"}
                </span>
                <span className="block truncate font-sans text-[0.7rem] text-ink/50">
                  {email}
                </span>
              </span>
            </div>

            <Link
              href="/dashboard/settings"
              className={buttonClasses({ variant: "secondary" })}
            >
              Settings
            </Link>

            <form action={logOut}>
              <Button type="submit" variant="ghost">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Hairline, fading out at both ends. */}
      <div aria-hidden="true" className={FADED_RULE_CLASSES} />
    </header>
  );
}

/**
 * A single letter, unlike the two a character avatar gets.
 *
 * The account badge sits next to the name it abbreviates, so a second letter
 * adds nothing — and one letter reads as a monogram rather than as a
 * shortened word, which is what keeps it from competing with the character
 * avatars further down the page.
 *
 * Iterated as code points so an accented or non-Latin first letter survives.
 */
function toInitials(value) {
  const first = Array.from(String(value).trim())[0];

  return first ? first.toUpperCase() : "?";
}
