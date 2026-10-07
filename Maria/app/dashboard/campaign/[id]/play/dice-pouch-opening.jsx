"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DICE_SKIN_VALUES, diceSkinRarity } from "sina/rules/character";
import { dicePouchChances, drawDiceSkin } from "sina/rules/dice-pouch";

import Button from "@/app/components/ui/button";
import { surfaceClasses } from "@/app/components/ui/surface";
import { useReducedMotion } from "@/app/components/use-reduced-motion";
import {
  diceColorHex,
  diceRarityLook,
  diceSkinDetails,
  diceSkinPictures,
  diceSkinTheme,
} from "@/app/dashboard/character-presentation";
import DicePicture from "@/app/dashboard/dice-picture";
import {
  PREVIEW_SET,
  PREVIEW_STAGE_ID,
  releasePreviewDie,
  showPreviewSet,
} from "@/app/dashboard/preview-roller";
import { DICE_TYPES } from "@/lib/dice-themes";

/** How many cards the reel holds, and which of them the set is placed on.
    A hundred to run past in the same seven seconds is what keeps the pace up;
    the eight after the winner fill the lane to its right once it stops. */
const REEL_LENGTH = 108;
const WINNER_AT = 100;

/**
 * Fast out of the gate and a firm brake, the way a case-opening reel slows.
 * The braking curve ends late (0.5 rather than 0.1), so the reel is still
 * moving with a second to go instead of crawling through the last card for
 * three — measured, the old one was inside its final card from 4.75s.
 */
const SPIN_MS = 7200;
const SPIN_EASING = "cubic-bezier(0.08, 0.6, 0.5, 1)";

/** The lane drawing itself before the sets come in — see `.pouch-edge` and
    `.pouch-marker` in globals.css, whose beats this follows. */
const LANE_MS = 1100;

/** How long the winning card is held, lit, before the window opens on it. */
const DWELL_MS = 1400;

/** The lane folding away, and the window folding shut. Must match the
    `[data-leaving]` and `[data-closing]` rules in globals.css. */
const FOLD_MS = 340;
const CLOSE_MS = 340;

/** The window has to finish opening before anything is thrown into it. */
const THROW_DELAY_MS = 700;

/**
 * Filler drawn at a real pouch's odds from what this one could hold, so the
 * reel looks like what it is. The set it stops on is the database's.
 */
function fillReel(unlocked) {
  const chances = dicePouchChances(unlocked);
  const odds =
    chances.length > 0
      ? chances
      : DICE_SKIN_VALUES.map((skin) => ({
          skin,
          chance: 1 / DICE_SKIN_VALUES.length,
        }));

  return Array.from({ length: REEL_LENGTH }, () => drawDiceSkin(odds));
}

/**
 * A Dice Pouch being opened: a lane drawing itself out of a dot, a reel of
 * sets coming in from the right and braking under a marker onto the one the
 * pouch held, then the lane folding away for a window with that set thrown
 * into a stone tray — and the window folding shut when it is closed.
 *
 * The motion is CSS (`.pouch-*` in globals.css) and the beats are the site's
 * own panel beats; this only says which stage it is at.
 *
 * `drawn` is the opening itself, asked for on the press rather than from an
 * effect — an effect runs twice in development, and twice is two pouches. It
 * resolves to the set, or null for a refusal, which closes this at once.
 *
 * `onAnnounce` is the log line, sent once the reel has stopped so the log does
 * not give the result away first. Nothing closes this before then.
 */
export default function DicePouchOpening({
  drawn,
  color,
  unlocked,
  onAnnounce,
  onClose,
}) {
  const titleId = useId();
  const dialog = useRef(null);
  const viewport = useRef(null);
  const strip = useRef(null);
  const still = useReducedMotion();

  /** When the lane began drawing itself; the sets wait for it to stand. */
  const openedAt = useRef(0);
  const closing = useRef(null);

  const [reel, setReel] = useState(() => fillReel(unlocked));
  const [won, setWon] = useState(null);
  const [travel, setTravel] = useState(0);
  const [phase, setPhase] = useState("drawing");

  const paint = diceColorHex(color);

  /* The latest callbacks, read when they are needed: the draw is answered
     once, and must not be answered again because a parent re-rendered. */
  const handlers = useRef({ onAnnounce, onClose });

  useEffect(() => {
    handlers.current = { onAnnounce, onClose };
  });

  useEffect(() => {
    openedAt.current = performance.now();
    dialog.current?.showModal();

    return () => clearTimeout(closing.current);
  }, []);

  /* Folded shut before it goes: `data-closing` starts the CSS, and the parent
     is told once it has played. Written straight onto the element, as the edit
     sheet does — nothing renders from it. */
  const close = useCallback(() => {
    if (closing.current) {
      return;
    }

    if (still) {
      closing.current = true;
      handlers.current.onClose();
      return;
    }

    if (dialog.current) {
      dialog.current.dataset.closing = "";
    }

    closing.current = setTimeout(() => handlers.current.onClose(), CLOSE_MS);
  }, [still]);

  useEffect(() => {
    let live = true;

    drawn.then((skin) => {
      if (!live) {
        return;
      }

      if (!skin) {
        close();
        return;
      }

      /* Somewhere inside the winning card rather than dead on its middle, so
         the last few cards keep the suspense. Measured rather than counted:
         a card is `w-28`, and the table's rem follows the window.

         FROM THE STRIP'S FIRST CARD, plus the lane-wide margin the strip
         starts behind (`ml-[100%]`, so the lane's own width). Never from
         `offsetLeft` alone: the strip's `will-change` makes IT the offset
         parent in Chromium and not in every engine, so whether that margin is
         in the number depends on the browser — and leaving it out stopped the
         reel six cards short of the set the pouch held. */
      const width = viewport.current?.clientWidth ?? 0;
      const first = strip.current?.children[0];
      const card = strip.current?.children[WINNER_AT];
      const centre =
        card && first
          ? width + card.offsetLeft - first.offsetLeft + card.offsetWidth / 2
          : 0;
      const lean = (Math.random() - 0.5) * (card?.offsetWidth ?? 0) * 0.7;

      setReel((cards) =>
        cards.map((one, index) => (index === WINNER_AT ? skin : one)),
      );
      setTravel(width / 2 - (centre + lean));
      setWon(skin);
      setPhase(still ? "landed" : "spinning");
    });

    return () => {
      live = false;
    };
  }, [drawn, still, close]);

  /* Before paint, so the strip is never seen at its end before it sets off:
     the inline transform already holds the end, for after the run, and the
     first frame holds it off the lane to the right until the lane stands. */
  useLayoutEffect(() => {
    if (phase !== "spinning" || !strip.current) {
      return undefined;
    }

    const wait = Math.max(0, openedAt.current + LANE_MS - performance.now());

    const spin = strip.current.animate(
      [
        { transform: "translateX(0px)" },
        { transform: `translateX(${travel}px)` },
      ],
      {
        duration: SPIN_MS,
        delay: wait,
        easing: SPIN_EASING,
        fill: "backwards",
      },
    );

    spin.onfinish = () => setPhase("landed");

    return () => {
      spin.onfinish = null;
      spin.cancel();
    };
  }, [phase, travel]);

  useEffect(() => {
    if (phase !== "landed") {
      return undefined;
    }

    const dwell = setTimeout(
      () => {
        handlers.current.onAnnounce();
        setPhase(still ? "revealed" : "folding");
      },
      still ? 0 : DWELL_MS,
    );

    return () => clearTimeout(dwell);
  }, [phase, still]);

  useEffect(() => {
    if (phase !== "folding") {
      return undefined;
    }

    const fold = setTimeout(() => setPhase("revealed"), FOLD_MS);

    return () => clearTimeout(fold);
  }, [phase]);

  const revealed = phase === "revealed";
  const stopped = phase === "landed" || phase === "folding";
  const look = won ? diceRarityLook(diceSkinRarity(won)) : null;

  return (
    /* No surface of its own: the lane is drawn straight onto the dimmed table,
       and the window the set arrives in is a panel of its own inside. */
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();

        if (revealed) {
          close();
        }
      }}
      className="pouch-dialog m-auto w-[calc(100%-2rem)] max-w-3xl overflow-x-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-black/80"
    >
      {revealed ? (
        <div
          className={surfaceClasses({
            variant: "solid",
            className: "pouch-panel rounded-2xl p-5 sm:p-7",
          })}
        >
          <Reveal
            titleId={titleId}
            skin={won}
            color={paint}
            still={still}
            onClose={close}
          />
        </div>
      ) : (
        <div
          className="pouch-stage py-6"
          data-leaving={phase === "folding" ? "" : undefined}
        >
          <h2
            id={titleId}
            className="pouch-words text-center font-display text-lg font-semibold tracking-wide text-gold"
          >
            Dice Pouch
          </h2>

          <p
            aria-live="polite"
            className={`pouch-words mt-1 min-h-4 text-center font-mono text-[0.625rem] tracking-[0.16em] uppercase ${
              stopped ? look.text : "text-ink/50"
            }`}
          >
            {phase === "drawing" && "Untying the pouch…"}
            {phase === "spinning" && "Tumbling out…"}
            {stopped && `${look.label}!`}
          </p>

          {/* THE LANE: a band between two edges, both fading out at the ends
              the way every hairline here does, and the cards inside it. The
              strip starts a lane's width to the right — `ml-[100%]` — so the
              sets come in from that side. */}
          <div className="relative mt-5 h-44">
            <span
              aria-hidden="true"
              className="pouch-band pointer-events-none absolute inset-0 bg-black/45 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] [mask-image:linear-gradient(90deg,transparent,black_14%,black_86%,transparent)]"
            />

            <div
              ref={viewport}
              className="pouch-reel absolute inset-0 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_14%,black_86%,transparent)]"
            >
              <ol
                ref={strip}
                aria-hidden="true"
                className="ml-[100%] flex h-full w-max items-center gap-2 will-change-transform"
                style={{
                  transform:
                    phase === "drawing" ? undefined : `translateX(${travel}px)`,
                }}
              >
                {reel.map((skin, index) => (
                  <ReelCard
                    // The reel never reorders: a card is its place on it.
                    key={index}
                    skin={skin}
                    color={paint}
                    lit={stopped && index === WINNER_AT}
                    dim={stopped && index !== WINNER_AT}
                  />
                ))}
              </ol>
            </div>

            <span
              aria-hidden="true"
              className="pouch-edge pouch-edge-top pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-gold/70 to-transparent"
            />
            <span
              aria-hidden="true"
              className="pouch-edge pouch-edge-bottom pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-gold/70 to-transparent"
            />

            {/* Where it all starts: the lane's first frame is this, alone. */}
            <span
              aria-hidden="true"
              className="pouch-dot pointer-events-none absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-gold opacity-0 shadow-[0_0_10px_2px_rgba(255,223,156,0.7)]"
            />

            <span
              aria-hidden="true"
              className="pouch-marker pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gold shadow-[0_0_14px_2px_rgba(255,223,156,0.65)]"
            />
            <span
              aria-hidden="true"
              className="pouch-notch pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 border-x-[0.4375rem] border-t-[0.625rem] border-x-transparent border-t-gold"
            />
            <span
              aria-hidden="true"
              className="pouch-notch pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 border-x-[0.4375rem] border-b-[0.625rem] border-x-transparent border-b-gold"
            />
          </div>
        </div>
      )}
    </dialog>
  );
}

/**
 * One set on the reel. The one the pouch held is LIT once the reel stops —
 * lifted over its neighbours (`z-10`, and 1.1 still clears the 11rem lane),
 * in its rarity's selected edge and glow — while every other card dims, so
 * what was won is plain before the window opens on it.
 */
function ReelCard({ skin, color, lit, dim }) {
  const look = diceRarityLook(diceSkinRarity(skin));

  return (
    <li
      className={`relative isolate flex h-36 w-28 shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border bg-surface/90 bg-linear-to-t to-transparent to-60% transition duration-500 ${look.wash} ${
        lit ? `z-10 scale-110 ${look.edgeSelected}` : look.edge
      } ${dim ? "opacity-35" : ""}`}
    >
      <span
        className={`pointer-events-none absolute inset-0 -z-10 rounded-[inherit] transition-opacity duration-500 ${
          lit ? look.glowSelected : look.glow
        }`}
      />

      <DicePicture
        picture={diceSkinPictures(skin).tile}
        color={color}
        className="size-20 drop-shadow-[0_8px_10px_rgba(0,0,0,0.6)]"
      />

      <span className="max-w-full truncate px-1.5 font-display text-[0.6875rem] font-semibold tracking-wide text-ink/80">
        {diceSkinDetails(skin).label}
      </span>

      <span className={`absolute inset-x-0 bottom-0 h-1 ${look.bar}`} />
    </li>
  );
}

/** The set the pouch held, named and thrown. */
function Reveal({ titleId, skin, color, still, onClose }) {
  const details = diceSkinDetails(skin);

  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-mono text-[0.625rem] tracking-[0.16em] text-ink/50 uppercase">
        A new dice set
      </p>

      <h2
        id={titleId}
        aria-live="polite"
        className="mt-1 font-display text-2xl font-semibold tracking-wide text-gold"
      >
        {details.label}
      </h2>

      <p
        className={`mt-1 font-mono text-[0.6875rem] tracking-[0.2em] uppercase ${details.rarity.text}`}
      >
        {details.rarity.label}
      </p>

      <p className="mt-1.5 text-xs text-ink/55">{details.description}</p>

      <StoneTray skin={skin} color={color} still={still} />

      <Button onClick={onClose} className="mt-7 min-w-32">
        Close
      </Button>
    </div>
  );
}

/**
 * The whole set, d100 aside, thrown into a bowl of stone by the sheet's own
 * preview roller. A press throws it again. For a reader who asked for
 * stillness, the set's pictures lie in the bowl instead.
 */
function StoneTray({ skin, color, still }) {
  const theme = diceSkinTheme(skin);
  const look = diceSkinDetails(skin).rarity;

  useEffect(() => {
    if (still) {
      return undefined;
    }

    const wait = setTimeout(() => showPreviewSet(color, theme), THROW_DELAY_MS);

    return () => {
      clearTimeout(wait);
      releasePreviewDie();
    };
  }, [color, still, theme]);

  const pictures = diceSkinPictures(skin);

  return (
    <div className="relative isolate mt-6 w-full max-w-sm">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-12 -z-10 rounded-full bg-radial to-transparent to-70% ${look.wash}`}
      />

      {still ? (
        <div className="dice-stone grid aspect-square w-full grid-cols-3 place-items-center gap-2 rounded-[1.75rem] p-8">
          {PREVIEW_SET.map((type) => (
            <DicePicture
              key={type}
              picture={pictures.set}
              color={color}
              cells={DICE_TYPES.length}
              cell={DICE_TYPES.indexOf(type)}
              className="aspect-square w-full max-w-20"
            />
          ))}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => showPreviewSet(color, theme)}
            aria-label={`Throw the ${diceSkinDetails(skin).label} set again`}
            className="dice-preview dice-stone block aspect-square w-full cursor-pointer overflow-hidden rounded-[1.75rem] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-gold"
          >
            <span
              id={PREVIEW_STAGE_ID}
              aria-hidden="true"
              className="block size-full"
            />
          </button>

          <p aria-hidden="true" className="mt-4 text-xs text-ink/50">
            Tap the tray to throw them again.
          </p>
        </>
      )}
    </div>
  );
}
