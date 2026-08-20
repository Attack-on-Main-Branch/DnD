import GrimoireMark from "@/app/components/grimoire-mark";
import { surfaceClasses } from "@/app/components/ui/surface";
import TypingText from "@/app/components/ui/typing-text";

import AuthForm from "./auth-form";

export const metadata = {
  title: "Sign in",
};

/*
 * Headline tuning. Plain class strings so Tailwind's scanner still sees them.
 *
 * The `10.5cqw` guard on TITLE_SIZE matters because the title is
 * `whitespace-nowrap`: an oversized title overflows rather than wrapping.
 * Cinzel at this tracking wants ~8.4px of width per px of font size.
 *
 * The book's own size lives as MARK_SIZE in components/grimoire-mark.jsx, so
 * the dashboard's corner copy matches and the flight between them has no
 * resize to interpolate. MARK_TO_PROSE clears the outer ring, which overhangs
 * the book's box by ~26% of its height, not the book.
 */
const TITLE_SIZE = "text-[min(3.7rem,10.5cqw)]";
const TITLE_TO_MARK = "-mt-4 sm:-mt-4";
const MARK_TO_PROSE = "mb-18";

/*
 * Percentages rather than pixels: a fixed 200px is a sixth of a 1200px laptop
 * and a tenth of a 2000px monitor. Raising LEFT_INSET also narrows the lore
 * panel, which gets whatever the card and the gap leave.
 */
const LEFT_INSET = "lg:pl-[7%]";
const RIGHT_INSET = "lg:pr-[14%]";

/* The ring arcs up over the title, so the top needs more room than the sides. */
const PANEL_PADDING = "p-6 pt-10 sm:p-8 sm:pt-10";

/**
 * Two columns: what the place is on the left, the way in on the right.
 *
 * No centred max-width container, unlike the rest of the app — a capped box
 * welds the panels together in the middle of a wide screen, since the gap can
 * only grow from the inside. The insets are in charge instead.
 */
export default function LoginPage() {
  return (
    // `overflow-x-clip` rather than `hidden`: a rotating square's bounding box
    // is wider than the square, enough to push the scroll width past the
    // viewport, and `clip` removes that without creating a scroll container.
    //
    // `@container/page` names the padded element so `side-by-side:` measures
    // the space the panels actually have. The insets stay plain viewport
    // classes — a query that changed its own container's padding is circular.
    <main
      className={`@container/page flex w-full flex-1 items-center overflow-x-clip px-5 py-14 sm:px-8 lg:py-20 ${LEFT_INSET} ${RIGHT_INSET}`}
    >
      {/*
        A fixed 28rem card track rather than a second `1fr`: every extra pixel
        lands in the lore track, which is capped at 2xl, so it becomes distance.
        `gap-24` is therefore only a floor at the threshold, not the spacing.
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

/** The mark, the name, and what the place is for. */
function LorePanel() {
  return (
    // Three elements, none of which can be merged. The outer owns the definite
    // width that lets `mx-auto` centre it; the middle is the glass layer's
    // positioning context; the inner owns `@container`, and
    // `container-type: inline-size` stops contents contributing to width — so
    // outer and inner alone collapsed the panel to its padding, 66px with a
    // 0px title.
    <div className="mx-auto w-full max-w-2xl side-by-side:mx-0">
      <div className="relative">
        {/*
          The glass is what makes the prose legible: unpanelled, this text
          measured 1.01:1 over a bulb centre. `.glass` carries
          `brightness(0.35)`, which multiplies, so the ground stays bounded
          however bright the backdrop clips.

          A layer of its own rather than the box the words sit in, so folding it
          leaves the grimoire's geometry alone. The book flies between this
          panel and the dashboard's corner, and React commits a navigation
          inside `startViewTransition` — a book scaled to 2% when the browser
          photographs the new page gives the flight a 2% place to land. Nothing
          is lost: the words have already faded before the fold begins.
        */}
        <div
          data-fold
          aria-hidden="true"
          className={surfaceClasses({
            className: "panel-in absolute inset-0 rounded-3xl",
          })}
        />

        <div
          className={`@container relative flex flex-col items-center text-center side-by-side:items-start side-by-side:text-left ${PANEL_PADDING}`}
        >
          {/* Typed out, as the dashboard's greeting is; the caret holds the
              line's height so the mark below never waits for the last letter.
              `whitespace-nowrap` because the mark overlaps the title, which
              only works on one line — wrapped, the book landed on "Tales". */}
          <h1
            className={`lore-fade font-display leading-[0.98] font-semibold tracking-[0.06em] whitespace-nowrap text-gold drop-shadow-[0_0_46px_rgba(255,223,156,0.34)] ${TITLE_SIZE}`}
          >
            <TypingText segments={[{ text: "Grimoire Tales" }]} />
          </h1>

          {/* `ml-16` clears the outer ring, which reaches ~26% of the mark's
              width past the text edge once the column is left-aligned. */}
          <GrimoireMark
            className={`${TITLE_TO_MARK} ${MARK_TO_PROSE} side-by-side:ml-16`}
          />

          <div className="lore-fade panel-content-in flex flex-col gap-5 font-display text-[clamp(0.95rem,1.25vw,1.125rem)] leading-[1.7] text-pretty text-ink/60">
            <p>
              Step beyond the veil into Grimoire Tales, an interactive tabletop
              role-playing platform crafted for adventurers seeking
              unforgettable, custom-tailored journeys. Here, bespoke D&amp;D
              chronicles come alive allowing you to create and bind your heroes,
              manage your inventory, and dive into immersive, narrative-driven
              campaigns shaped by your choices and imagination.
            </p>

            <p>
              Whether you are here to test your mettle against ancient beasts,
              uncover forgotten arcane secrets, or weave epic sagas alongside
              your party, your personal tome awaits. Sign in to unseal your
              chronicles, awaken the light of your journey, and let destiny
              unfold with every roll.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
