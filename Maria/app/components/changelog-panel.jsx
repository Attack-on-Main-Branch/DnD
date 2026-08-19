"use client";

import { useEffect, useId, useRef, useState } from "react";

import GrimoireMark from "./grimoire-mark";
import { FADED_RULE_CLASSES, surfaceClasses } from "./ui/surface";

/**
 * The grimoire in the dashboard's corner, and the changelog it opens.
 *
 * A disclosure rather than a modal: nothing is trapped, and focus returns to
 * the book on close. The panel stays mounted while closed so it can slide, and
 * carries `inert` in that state — off-screen is not unreachable, and without it
 * everything inside stays in the tab order.
 *
 * The entries arrive as already-rendered `children` from a Server Component:
 * everything this file imports goes to the browser with it, and the prose is a
 * few thousand words of static English. Only `open` and the focus work need to
 * be client-side.
 */
export default function ChangelogPanel({ children }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const launcherRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        // Without this the caret is left on <body> and the next Tab starts
        // again from the top of the document.
        launcherRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  return (
    <>
      {/*
        `z-0` on purpose. The dashboard's own content renders after this and
        paints over it, so the book sits behind the cards rather than on top of
        them — and because hit-testing follows the same order, a card in front
        of it takes the click. Only the part you can actually see is clickable.
      */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        // `mark-launcher` rather than a hover utility: scaling the button
        // scaled the rings too. globals.css lifts the book alone.
        className="mark-launcher fixed bottom-20 left-20 z-0 cursor-pointer rounded-full"
      >
        {/* Width and the image-size hint both come from the component, so this
            copy and the login page's are always the same — see MARK_SIZE in
            grimoire-mark.jsx. */}
        <GrimoireMark tilt="-30deg" />
        <span className="sr-only">What&rsquo;s new</span>
      </button>

      {/* Mounted either way: rendered only while open it arrived at full
          strength on its first frame. Same duration and curve as the panel, so
          it darkens in step. `pointer-events-none` while closed, or an
          invisible sheet swallows every click on the page. */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-500 ease-tray motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id={panelId}
        aria-label="Changelog"
        inert={!open}
        className={surfaceClasses({
          variant: "solid",
          className: `fixed inset-y-0 left-0 z-50 flex w-[min(26rem,88vw)] flex-col rounded-none border-y-0 border-l-0 transition-transform duration-500 ease-tray motion-reduce:transition-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`,
        })}
      >
        <div className="flex items-baseline justify-between gap-4 px-6 pt-7 pb-4">
          <h2 className="font-display text-xl font-semibold tracking-wide text-gold">
            What&rsquo;s new
          </h2>

          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="cursor-pointer rounded-md px-2 py-1 font-display text-sm tracking-wide text-ink/60 transition-colors duration-300 hover:text-gold"
          >
            Close
          </button>
        </div>

        {/* The same hairline the site header carries under its own title. */}
        <div aria-hidden="true" className={FADED_RULE_CLASSES} />

        {/*
          Focusable, because nothing inside it is. Every entry is a heading, a
          `<time>` and static text, and the panel's only tab stop — Close — sits
          in the header above, outside this box: with focus there, arrow keys
          and PageDown scroll the document instead of the list, so a keyboard
          user could open the changelog and never reach past the first screen
          of it. Some browsers now make overflow containers focusable on their
          own, but that is recent and not universal.

          Named, because a focusable region without a name is announced as
          nothing. `aria-label` rather than pointing at the "What's new"
          heading: this is the list, not a second copy of the panel, which
          already carries that name on the `<aside>`.

          No guard needed for the closed state — `inert` on the `<aside>` takes
          this tab stop out with everything else.
        */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Changelog entries"
          className="scroll-gold flex-1 overflow-y-auto px-6 pt-5 pb-8"
        >
          {children}
        </div>
      </aside>
    </>
  );
}
