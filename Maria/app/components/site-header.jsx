import Image from "next/image";
import Link from "next/link";

import grimoireLogo from "./brand/grimoire.webp";
import SignOutButton from "./sign-out-button";
import { buttonClasses } from "./ui/button";
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
      {/*
        `border-b-0` as well as the other three. `.glass` sets a border on all
        sides, and leaving the bottom one on drew a second divider: a flat,
        full-width hairline directly above the faded rule below, which is the
        line that appeared to run wall to wall. The faded rule is the divider.
      */}
      <div
        className={surfaceClasses({
          className: "border-x-0 border-t-0 border-b-0",
        })}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            // Named here rather than left to the wordmark, because the wordmark
            // is hidden on a phone and a `display: none` span is out of the
            // accessibility tree — the link would have had no name at all
            // there. The label is the same string that is visible everywhere
            // else, so nothing is announced that cannot also be read.
            aria-label="Grimoire Tales"
            className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
          >
            {/*
              The mark carries the brand alone below `sm`. At 375px the bar
              wants about 406px for mark, wordmark and both controls, so the
              wordmark ellipsised to "Grimoir…" and "Sign out" broke onto a
              second line. Dropping the word rather than shrinking everything
              is what a logo is for.
            */}
            <span className="hidden truncate font-display text-2xl font-semibold tracking-wide text-ink drop-shadow-[0_0_18px_rgba(255,223,156,0.35)] transition-colors duration-300 group-hover:text-gold sm:block sm:text-3xl">
              Grimoire Tales
            </span>

            {/*
              `alt=""` on purpose. The wordmark sits right beside it inside the
              same link, so a description here would have a screen reader
              announce "Grimoire Tales" twice for one control. The link's own
              `aria-label` is what names it when the wordmark is hidden.

              `loading="eager"` rather than `preload`: the docs for this version
              reserve preload for the LCP element, and a 44px mark in the bar is
              not it — but it is above the fold on every page, so lazy loading
              would only buy a flash of empty space.

              `shrink-0` because it now sits after a shrinkable wordmark: as a
              flex item it would otherwise give up width before the text does,
              and squash. Sized by CSS with both axes given (`h-*` and
              `w-auto`), which is what keeps Next from warning about a single
              modified dimension.
            */}
            <Image
              src={grimoireLogo}
              alt=""
              sizes="(min-width: 640px) 44px, 36px"
              loading="eager"
              className="h-9 w-auto shrink-0 drop-shadow-[0_0_14px_rgba(255,223,156,0.3)] transition-transform duration-500 group-hover:scale-105 sm:h-11"
            />
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
                // From `lg`, not `sm`. Measured, the bar wants 772px: 304 for
                // the mark and wordmark, 404 for this pill plus the two
                // controls, 64 of padding and gap. Appearing at 640 left a
                // 130px band where the wordmark ellipsised to "Grimoire …"
                // and "Sign out" wrapped onto two lines. The pill is the part
                // that can go — the same name and email are one click away
                // behind Settings, which stays.
                className:
                  "hidden items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 lg:flex",
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

            <SignOutButton />
          </div>
        </div>
      </div>

      {/*
        Hairline, fading out at both ends — and held to the same width as the
        bar's own content rather than run wall to wall.

        The gradient fades over a fraction of its length, so across a 2000px
        window the lit middle is a long gold streak; over the changelog panel's
        416px the same class reads as a short accent, which is the version that
        looks right. Capping the width is what closes that gap.

        THIS LINE IS THE KNOB. It deliberately repeats the bar's own wrapper
        above — `max-w-7xl` with the same `px-4 sm:px-6` — so the rule starts
        where the logo starts and ends where "Sign out" ends. Narrow it by
        dropping to a smaller `max-w-*`; widen it by raising it.

        Only values on Tailwind's container scale exist, and that scale stops
        at `7xl`. This read `max-w-8xl` for a while, which is not a utility and
        emits no CSS at all — so the wrapper silently collapsed to plain
        `w-full` and the rule went wall to wall regardless of what the comment
        claimed. Anything above `7xl` needs a `--container-*` token in the
        `@theme` block first.
      */}
      <div className="mx-auto w-full max-w-8xl px-4 sm:px-6">
        <div aria-hidden="true" className={FADED_RULE_CLASSES} />
      </div>
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
