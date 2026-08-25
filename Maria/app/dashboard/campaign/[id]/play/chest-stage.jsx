"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChestMark from "@/app/components/ui/chest-mark";
import {
  FADED_RULE_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";

import DmChestDrawer from "./dm-chest-drawer";
import { RAIL_MIRRORED_CLASSES, railEntrance } from "./entrance";
import { POPOVER_BODY_CLASSES } from "./table-popover";
import { useChestItems, useContainers } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The containers, on the rail opposite the dice — AND THE HEAD OF THE TABLE'S
 * ALONE. Filling a chest, revealing it and handing a bag over are all theirs;
 * what a player may reach is in the pack above the board, beside everything
 * else they carry.
 *
 * Beside the map rather than a fourth mark above it: the marks up there are
 * things a SEAT owns, and the shelf is the world's. The rail was already there,
 * an empty box balancing the dice so the map keeps the viewport's centre line.
 *
 * The shelf's doorbells are in inventory-pack.jsx, the one control both chairs
 * mount. See the head of use-containers.js.
 */

/** Everything a Tab can reach inside the drawer, for the keyboard loop below. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ChestStage({ campaignId, members }) {
  const containers = useContainers();
  const chests = useChestItems();
  const { send } = useTableDeed(campaignId);

  const [open, setOpen] = useState(false);

  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  // Anywhere outside closes, and pointerdown rather than click so a drag that
  // starts outside does not leave it open behind the pointer.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event) {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /*
   * Focus moves in with the drawer, or Escape has nothing to catch and the
   * control opens somewhere a keyboard cannot reach. `preventScroll`, because
   * the board's row is clipped on both axes and the browser would otherwise
   * scroll the whole page to reveal a control halfway down the panel.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;

    (panel?.querySelector(FOCUSABLE) ?? panel)?.focus({ preventScroll: true });
  }, [open]);

  /** Escape closes; Tab stays inside. TablePopover's trap, for its reasons. */
  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const stops = [...panelRef.current.querySelectorAll(FOCUSABLE)];

    if (stops.length === 0) {
      event.preventDefault();
      return;
    }

    const first = stops[0];
    const last = stops[stops.length - 1];
    const here = document.activeElement;

    if (event.shiftKey && (here === first || here === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && here === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** What the other chairs hear once the server has taken a deed. */
  const told = useCallback(() => send({ kind: "chest" }), [send]);

  return (
    <div
      ref={wrapRef}
      data-tuck="right"
      style={railEntrance()}
      className={`relative flex w-14 shrink-0 flex-col items-center ${RAIL_MIRRORED_CLASSES}`}
    >
      {/* A mark and not a button: no rim, no fill, nothing behind the drawing,
          exactly as the dice opposite and the three above the board. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((standing) => !standing)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Bags and chests, ${containers.length}`}
        className="grid size-15 cursor-pointer place-items-center rounded-full text-ink/60 transition-colors duration-300 hover:text-gold focus-visible:text-gold"
      >
        <ChestMark className="size-13" />
      </button>

      {/*
        The marks' own panel, opening sideways. Over the board rather than down
        from it: this rail stands on the map's vertical centre, so a panel
        dropping from `top-full` would end below the window.

        The morph is `.tray-shell` — `.tab-shell` with its axis turned. `group`
        is for the arrow below, which lights with the panel it points at.
      */}
      <div
        className={[
          "group absolute top-1/2 left-full z-40 ml-4 -translate-y-1/2",
          TRAY_WIDTH_CLASSES,
          "transition-opacity duration-300",
          open
            ? "ease-tray opacity-100"
            : "pointer-events-none ease-tray-in opacity-0",
          "motion-reduce:transition-none",
        ].join(" ")}
      >
        <div className="tray-shell" data-state={open ? "open" : "collapsed"}>
          <div className="tray-clip">
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Containers at this table"
              tabIndex={-1}
              inert={!open || undefined}
              onKeyDown={onKeyDown}
              className={surfaceClasses({
                variant: "solid",
                glow: true,
                className: [
                  "tray-panel",
                  TRAY_WIDTH_CLASSES,
                  // A closed panel keeps filtering its backdrop — `opacity: 0`
                  // does not stop it — which over the board showed as a dark
                  // slab beside the map.
                  "glass-unfiltered rounded-2xl text-left outline-none",
                  open
                    ? "motion-safe:animate-[tray-panel-in_380ms_var(--ease-tray)]"
                    : "",
                ].join(" "),
              })}
            >
              <div className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-3">
                <h2 className="min-w-0 truncate font-display text-sm font-semibold tracking-wide text-gold">
                  Bags and chests
                </h2>

                <p className="shrink-0 font-mono text-xs tracking-[0.2em] text-ink/45 uppercase">
                  {containers.length}
                </p>
              </div>

              {/* The hairline the header and the changelog drawer carry. */}
              <div aria-hidden="true" className={FADED_RULE_CLASSES} />

              <div
                className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${POPOVER_BODY_CLASSES}`}
              >
                <DmChestDrawer
                  campaignId={campaignId}
                  containers={containers}
                  chests={chests}
                  members={members}
                  onTold={told}
                />
              </div>
            </div>
          </div>
        </div>

        {/* The marks' own arrow, turned a quarter. Outside `.tray-clip` and
            after it in the DOM: the clip holds the inline axis at the box edge,
            which is the edge this hangs off, and a later sibling paints over
            the panel's fill without a z-index. `border-b border-l` meet at the
            corner a 45° rotation puts on the left. */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-l border-gold/25 bg-[var(--surface-96)] transition-colors duration-300 group-focus-within:border-gold/60 group-hover:border-gold/60 motion-reduce:transition-none"
        />
      </div>
    </div>
  );
}

/**
 * How wide the tray stands. A literal, or Tailwind's scanner never sees it, and
 * on BOTH the column and the panel: a grid track at `0fr` has no space to hand
 * out, so a panel sized against the track would reflow to nothing on the way in.
 */
const TRAY_WIDTH_CLASSES = "w-[min(26rem,calc(100vw-6rem))]";
