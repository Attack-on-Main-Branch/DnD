import GrimoireMark from "@/app/components/grimoire-mark";
import { surfaceClasses } from "@/app/components/ui/surface";

import AuthForm from "./auth-form";

export const metadata = {
  title: "Sign in",
};

/*
 * ── Tuning the headline block ────────────────────────────────────────────────
 *
 * The four values worth nudging by eye, kept together so they can be found.
 * They are plain class strings so Tailwind's scanner still sees them; edit the
 * numbers inside the brackets, not the shape.
 *
 * TITLE_SIZE      how big "Grimoire Tales" is: a cap, and `10.5cqw` — 10.5%
 *                 of the panel's own inner width — for everything below it.
 *                 The rem is the number to nudge. The cqw is a guard, and it
 *                 is there because the title is `whitespace-nowrap`: a size
 *                 that does not fit overflows rather than wrapping. Measured,
 *                 Cinzel at this tracking wants about 8.4px of width per px of
 *                 font size, so 10.5% of the panel leaves roughly a tenth of
 *                 the line spare at every width, phone included.
 *
 * TITLE_TO_MARK   how far the book rides up into the title. More negative =
 *                 more overlap. This is the reference's look and it is why the
 *                 title has to stay on one line.
 *
 * The book's size is NOT here. It lives as MARK_SIZE in
 * components/grimoire-mark.jsx, along with the matching `sizes` hint, because
 * the dashboard's corner copy has to be exactly the same width — otherwise the
 * flight between them has a resize to interpolate as well as a move.
 *
 * MARK_TO_PROSE   the gap under the book. It has to clear the rings, not the
 *                 book: the outer ring overhangs the book's box by about 26%
 *                 of its height at each end, which is roughly 80px at the
 *                 current size. Too small and the ring's dashes land on the
 *                 first paragraph.
 */
const TITLE_SIZE = "text-[min(3.7rem,10.5cqw)]";
const TITLE_TO_MARK = "-mt-4 sm:-mt-4";
const MARK_TO_PROSE = "mb-18";

/*
 * ── The two panels' distance from the window edges ───────────────────────────
 *
 * Percentages, not pixels, and that is the point: a fixed 200px is a sixth of
 * a 1200px laptop and a tenth of a 2000px monitor, so any number tuned on one
 * screen is wrong on the other. A percentage keeps the same proportion at
 * every size.
 *
 * They resolve against the window width. Raising either moves that panel
 * inward and closes the middle at the same time — and raising LEFT_INSET also
 * narrows the lore panel, since it gets whatever the card and the gap leave.
 *
 * Push them far enough and the two simply stop fitting side by side. That is
 * handled rather than tolerated: see SIDE_BY_SIDE below.
 */
const LEFT_INSET = "lg:pl-[7%]";
const RIGHT_INSET = "lg:pr-[14%]";

/*
 * ── When the two sit side by side ────────────────────────────────────────────
 *
 * The `side-by-side:` variant used below is defined once in globals.css, and
 * the threshold lives there — change it in that one place.
 *
 * It is a container query on the space actually left after the insets, NOT a
 * viewport breakpoint. A breakpoint only knows how wide the window is; it
 * cannot know that the insets have eaten half of it, which is exactly how the
 * lore panel ended up as a 417px column wrapping four words to a line.
 *
 * Below the threshold the grid drops to one column and the panels stack — lore
 * first, sign-in under it. That is also the phone layout, reached by the same
 * rule rather than by a second one, so there is no width where the two
 * disagree.
 *
 * (It cannot be a JS constant spliced into the class strings: Tailwind finds
 * class names by scanning the source text, and `${VARIANT}:grid-cols-…` is not
 * a name it can see.)
 */

/*
 * The panel's own padding, for the same reason: the ring arcs up over the
 * title, so the top needs far more room than the sides. Cut it and the dashes
 * touch the frame.
 */
const PANEL_PADDING = "p-6 pt-10 sm:p-8 sm:pt-10";

/**
 * Two columns: what the place is on the left, the way in on the right.
 *
 * No centred max-width container, unlike the rest of the app. A capped,
 * centred box is exactly what kept the two panels welded together in the
 * middle of a wide screen — the gap could only ever grow from the inside.
 * Letting the page run the full window and pushing each panel in from its own
 * edge is what puts LEFT_INSET and RIGHT_INSET in charge instead.
 *
 * When they do not fit, they stack: lore first, sign-in under it. Same rule on
 * a phone, so there is no width at which the two layouts disagree.
 */
export default function LoginPage() {
  return (
    // `overflow-x-clip` rather than `hidden`: the rune rings are square boxes
    // that rotate, and a rotating square's bounding box is wider than the
    // square — enough to push the document's scroll width past the viewport on
    // a phone. `clip` removes the overflow without creating a scroll
    // container, so it cannot trap vertical scrolling. Only empty box is cut:
    // the visible ring is a circle, and rotating a circle changes nothing.
    // `@container/page` names this element so the `side-by-side:` variant can
    // measure it. Deliberately the padded element: its content box is the
    // space the two panels actually have, insets already subtracted. The
    // insets themselves are plain viewport classes, never container-query
    // ones — a query that changed its own container's padding would be
    // circular.
    <main
      className={`@container/page flex w-full flex-1 items-center overflow-x-clip px-5 py-14 sm:px-8 lg:py-20 ${LEFT_INSET} ${RIGHT_INSET}`}
    >
      {/*
        The card track is a fixed 28rem rather than a second `1fr`. That is
        what makes the two drift apart: the card takes exactly what it needs
        and every extra pixel lands in the lore track, which the panel does not
        use because it is capped at 2xl — so it becomes distance instead.

        `side-by-side:gap-24` is a floor rather than the spacing. Once the lore
        panel is at its cap the leftover track is the real gap, so on a wide
        screen this number does nothing; it only sets how close the two may
        come right at the threshold, where every pixel it takes is a pixel off
        the lore panel.
      */}
      <div className="grid w-full items-center gap-14 side-by-side:grid-cols-[minmax(0,1fr)_28rem] side-by-side:gap-24">
        <LorePanel />

        <div className="w-full max-w-md justify-self-center side-by-side:justify-self-end">
          <AuthForm />
        </div>
      </div>
    </main>
  );
}

/**
 * The mark, the name, and what the place is for.
 *
 * Centred while the columns are stacked and left-aligned once they are side by
 * side: a left-aligned block of prose under a centred phone layout reads as a
 * mistake, and a centred one beside the card reads as a poster.
 */
function LorePanel() {
  return (
    // Two elements, and the split is load-bearing.
    //
    // The outer one owns the width and the centring: `w-full max-w-2xl` is a
    // definite width, which is what lets `mx-auto` centre it while stacked and
    // `side-by-side:mx-0` hand alignment back to the grid.
    //
    // The inner one owns the glass and `@container`. They cannot be the same
    // element: `container-type: inline-size` contains the inline axis, so the
    // contents stop contributing to the width — and `margin-inline: auto` on a
    // grid item asks for exactly that content-based width. Together they
    // collapsed the panel to its own padding, 66px wide with a 0px title.
    <div className="mx-auto w-full max-w-2xl side-by-side:mx-0">
      {/*
        The same glass as the sign-in card, so the two halves are one material.
        It is also what makes the prose legible: unpanelled, this text was
        composited straight onto the animated plume and measured 1.01:1 over a
        bulb centre. `.glass` carries `brightness(0.35)`, which multiplies —
        however bright the backdrop clips, the ground it leaves stays bounded.

        `@container` so the title is sized against this panel rather than the
        window, which is what lets the insets move freely without the nowrap
        title spilling out of a panel it no longer fits.
      */}
      <div
        className={surfaceClasses({
          // No entrance animation here, deliberately. This panel used to rise
          // 12px and fade in over 0.9s — and the grimoire is inside it, so
          // arriving from the dashboard the book flew precisely to its mark,
          // the transition handed over, and then the panel underneath carried
          // it 12px down while still half transparent. That was the jump on
          // sign-out, and the reason only that direction had one: the corner
          // copy has no animating ancestor. Navigation already cross-fades the
          // whole page, so nothing is lost.
          className: `@container flex flex-col items-center rounded-3xl text-center side-by-side:items-start side-by-side:text-left ${PANEL_PADDING}`,
        })}
      >
        {/*
        `whitespace-nowrap` because the mark below deliberately overlaps the
        title, and that only works while the title is a single line. Wrapped,
        the book landed on top of the word "Tales".
      */}
        <h1
          className={`font-display leading-[0.98] font-semibold tracking-[0.06em] whitespace-nowrap text-gold drop-shadow-[0_0_46px_rgba(255,223,156,0.34)] ${TITLE_SIZE}`}
        >
          Grimoire Tales
        </h1>

        {/*
          `side-by-side:ml-16` because once the column goes left-aligned the
          mark starts at the text edge — but the outer ring reaches about 26%
          of the mark's width further left again, past the panel's padding.
          64px clears it.
        */}
        <GrimoireMark
          className={`${TITLE_TO_MARK} ${MARK_TO_PROSE} side-by-side:ml-16`}
        />

        <div className="flex flex-col gap-5 font-display text-[clamp(0.95rem,1.25vw,1.125rem)] leading-[1.7] text-pretty text-ink/60">
          <p>
            Step beyond the veil into Grimoire Tales, an interactive tabletop
            role-playing platform crafted for adventurers seeking unforgettable,
            custom-tailored journeys. Here, bespoke D&amp;D chronicles come
            alive allowing you to create and bind your heroes, manage your
            inventory, and dive into immersive, narrative-driven campaigns
            shaped by your choices and imagination.
          </p>

          <p>
            Whether you are here to test your mettle against ancient beasts,
            uncover forgotten arcane secrets, or weave epic sagas alongside your
            party, your personal tome awaits. Sign in to unseal your chronicles,
            awaken the light of your journey, and let destiny unfold with every
            roll.
          </p>
        </div>
      </div>
    </div>
  );
}
