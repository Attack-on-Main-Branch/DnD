"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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

/** One card on the reel and the gap after it, in pixels: `w-28` and `gap-2`. */
const CARD = 112;
const STEP = CARD + 8;

/** How many cards the reel holds, and which of them the set is placed on. */
const REEL_LENGTH = 60;
const WINNER_AT = 52;

/** A fast start and a long brake, the way a case-opening reel slows. */
const SPIN_MS = 7200;
const SPIN_EASING = "cubic-bezier(0.05, 0.7, 0.1, 1)";

/** How long the winning card is held before the window opens on it. */
const DWELL_MS = 1100;

/** The window has to finish opening before anything is thrown into it. */
const THROW_DELAY_MS = 450;

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
 * A Dice Pouch being opened: a reel of sets running under a marker and braking
 * onto the one the pouch held, then a window with that set thrown into a stone
 * tray.
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
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    let live = true;

    drawn.then((skin) => {
      if (!live) {
        return;
      }

      if (!skin) {
        handlers.current.onClose();
        return;
      }

      /* Somewhere inside the winning card rather than dead on its middle, so
         the last few cards keep the suspense. */
      const width = viewport.current?.clientWidth ?? 0;
      const lean = (Math.random() - 0.5) * CARD * 0.7;

      setReel((cards) =>
        cards.map((card, index) => (index === WINNER_AT ? skin : card)),
      );
      setTravel(width / 2 - (WINNER_AT * STEP + CARD / 2 + lean));
      setWon(skin);
      setPhase(still ? "landed" : "spinning");
    });

    return () => {
      live = false;
    };
  }, [drawn, still]);

  /* Before paint, so the strip is never seen at its end before it sets off:
     the inline transform already holds the end, for after the run. */
  useLayoutEffect(() => {
    if (phase !== "spinning" || !strip.current) {
      return undefined;
    }

    const spin = strip.current.animate(
      [
        { transform: "translateX(0px)" },
        { transform: `translateX(${travel}px)` },
      ],
      { duration: SPIN_MS, easing: SPIN_EASING },
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
        setPhase("revealed");
      },
      still ? 0 : DWELL_MS,
    );

    return () => clearTimeout(dwell);
  }, [phase, still]);

  const revealed = phase === "revealed";
  const look = won ? diceRarityLook(diceSkinRarity(won)) : null;

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();

        if (revealed) {
          onClose();
        }
      }}
      className={surfaceClasses({
        variant: "solid",
        className:
          "m-auto w-[calc(100%-2rem)] max-w-3xl overflow-x-hidden rounded-2xl p-0 text-ink backdrop:bg-black/80",
      })}
    >
      <div className="p-5 sm:p-7">
        {revealed ? (
          <Reveal
            titleId={titleId}
            skin={won}
            color={paint}
            still={still}
            onClose={onClose}
          />
        ) : (
          <>
            <h2
              id={titleId}
              className="text-center font-display text-lg font-semibold tracking-wide text-gold"
            >
              Dice Pouch
            </h2>

            <p
              aria-live="polite"
              className={`mt-1 min-h-4 text-center font-mono text-[10px] tracking-[0.16em] uppercase ${
                phase === "landed" ? look.text : "text-ink/50"
              }`}
            >
              {phase === "drawing" && "Untying the pouch…"}
              {phase === "spinning" && "Tumbling out…"}
              {phase === "landed" && `${look.label}!`}
            </p>

            <div
              ref={viewport}
              className="relative mt-5 h-44 overflow-hidden rounded-xl border border-gold/20 bg-black/45 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] [mask-image:linear-gradient(90deg,transparent,black_14%,black_86%,transparent)]"
            >
              <ol
                ref={strip}
                aria-hidden="true"
                className="flex h-full items-center gap-2 will-change-transform"
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
                    lit={phase === "landed" && index === WINNER_AT}
                    dim={phase === "landed" && index !== WINNER_AT}
                  />
                ))}
              </ol>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gold shadow-[0_0_14px_2px_rgba(255,223,156,0.65)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 border-x-[7px] border-t-[10px] border-x-transparent border-t-gold"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 border-x-[7px] border-b-[10px] border-x-transparent border-b-gold"
              />
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function ReelCard({ skin, color, lit, dim }) {
  const look = diceRarityLook(diceSkinRarity(skin));

  return (
    <li
      className={`relative isolate flex h-36 w-28 shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border bg-surface/90 bg-linear-to-t to-transparent to-60% transition duration-500 ${look.wash} ${
        lit ? `scale-105 ${look.edgeSelected}` : look.edge
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

      <span className="max-w-full truncate px-1.5 font-display text-[11px] font-semibold tracking-wide text-ink/80">
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
    <div className="pouch-reveal flex flex-col items-center text-center">
      <p className="font-mono text-[10px] tracking-[0.16em] text-ink/50 uppercase">
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
        className={`mt-1 font-mono text-[11px] tracking-[0.2em] uppercase ${details.rarity.text}`}
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
