"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  alignmentLabel,
  characterHandle,
  classLabel,
} from "sina/rules/character";

import Avatar from "@/app/components/ui/avatar";
import ConfirmDialog from "@/app/components/ui/confirm-dialog";
import { surfaceClasses } from "@/app/components/ui/surface";

import { deleteCharacter } from "./actions";
import { raceImage } from "./character-presentation";

/** How long "Copied" stays up before the label goes back to the invitation. */
const COPIED_MS = 1600;

/*
 * A note on `aspect-video min-h-58 w-full`, all three of which are load-bearing.
 *
 * 16:9 fixes the height from the width, and below roughly 400px of width that
 * height is less than the name, four facts and the corner row need — the card
 * would clip rather than shrink. `min-h-58` is that floor, and the number is
 * the content measured at the tighter of the two cases — `sm`, where the
 * padding is 20px: 1px of border, 20px of padding, a 56px avatar, an 8px gap,
 * four 20px facts with 6px between them, then the corner row's own 20px line
 * and its 20px inset. 232px leaves 8px of clearance, 16px at the base spacing.
 * Adding the class row is what moved it up from 52.
 *
 * `w-full` is here because a minimum height transfers *through* an aspect
 * ratio into a minimum width: without it the card demands 232 × 16/9 = 412px
 * and takes that width whatever its grid column says, overflowing the column
 * at every breakpoint. `min-width: 0` does not help — the transfer lands on
 * the used inline size rather than on min-width — but a definite width does.
 *
 * And the spacing deliberately does not grow at `sm`. It used to add 4px to
 * the avatar gap and 2px to each gap between facts, and with the class row
 * that put the fourth fact on top of the Retire line at every desktop width —
 * because out there it is the floor that binds, not the ratio, so the card
 * cannot grow to absorb it.
 */

/**
 * One character as a 16:9 tile, with the artwork for their race behind it.
 *
 * The whole card is a link, but the retire and copy controls cannot live
 * inside an anchor — nested interactive elements are invalid HTML and a
 * keyboard user could never reach the inner ones. So the link is a stretched
 * overlay covering the card, and both controls sit above it on a higher layer.
 *
 * Only the artless variant is real glass. Where there is artwork the picture
 * is opaque and covers the whole tile, so a backdrop filter would sample
 * something nobody can see — and each one costs a full compositor readback per
 * frame against the animated background. Same rim, same glow, no filter.
 */
export default function CharacterCard({ character }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handle = characterHandle(character);
  const artwork = raceImage(character.race);

  // Null for anyone made before classes existed. The row is left out rather
  // than filled with a dash: an empty label is worse than one fewer fact, and
  // those cards then keep their 16:9 in places where four facts would not fit.
  const characterClass = classLabel(character.class_id);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyHandle() {
    try {
      await navigator.clipboard.writeText(handle);
      setCopied(true);
    } catch {
      // Denied permission, or an insecure origin. Nothing useful to say — the
      // label simply does not change, and the handle is on the card to read.
    }
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteCharacter(character.id);

      if (result?.kind === "rejected") {
        setError(result.message);
        setConfirming(false);
        return;
      }

      // On success the card unmounts with the revalidated list, so there is
      // nothing left here to tidy up.
      setConfirming(false);
    });
  }

  return (
    <>
      <article
        className={
          artwork
            ? // `rim-gold` rather than border and shadow utilities: utilities
              // sit in a later layer than components, so they would outrank
              // `.glow-gold:hover` and the rim would never light up.
              `rim-gold glow-gold group relative aspect-video min-h-58 w-full overflow-hidden rounded-2xl bg-surface ${
                isPending ? "pointer-events-none opacity-60" : ""
              }`
            : surfaceClasses({
                glow: true,
                className: `group relative aspect-video min-h-58 w-full overflow-hidden rounded-2xl ${
                  isPending ? "pointer-events-none opacity-60" : ""
                }`,
              })
        }
      >
        {artwork && (
          <Image
            src={artwork}
            alt=""
            fill
            // Three across at desktop inside a 7xl container, two at tablet,
            // one on a phone. Without this Next assumes full width and ships
            // a needlessly large file.
            sizes="(min-width: 1024px) 400px, (min-width: 768px) 45vw, 90vw"
            // A static import gives Next an 8×5 base64 preview for free, and
            // it is already in the bundle whether or not it is used.
            placeholder="blur"
            // objectFit has to come from the style object, not the Tailwind
            // class: Next reads it from `style` to size the blur backdrop, and
            // with the class alone the backdrop resolves to `auto` and the
            // preview sits unscaled in the corner instead of covering.
            style={{ objectFit: "cover" }}
            className="transition-transform duration-700 group-hover:scale-105"
          />
        )}

        {/*
          A wash from the lower left, where the text sits. Not a flat scrim:
          the art stays legible on the right while the type gets a ground dark
          enough to read against.
        */}
        {artwork && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-tr from-[#0f0c08]/95 via-[#0f0c08]/55 to-transparent"
          />
        )}

        <div className="relative flex h-full flex-col gap-2 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Avatar name={character.name} colorTheme={character.color_theme} />

            {/*
              Above the stretched link rather than under it, so the copy click
              lands here. It is a button, not part of the link: the card opens
              the sheet, this one takes the handle.
            */}
            <button
              type="button"
              onClick={copyHandle}
              disabled={isPending}
              aria-label={`Copy ${handle}`}
              className="group/copy relative z-10 min-w-0 cursor-pointer rounded-lg text-left"
            >
              <span className="block truncate font-display text-xl leading-tight font-semibold text-ink drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-colors duration-300 group-hover/copy:text-gold">
                {character.name}
              </span>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-full left-0 mt-1 rounded-md border border-gold/25 bg-[#0f0c08]/95 px-2 py-1 font-sans text-[0.7rem] whitespace-nowrap text-gold opacity-0 transition-opacity duration-200 group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100"
              >
                {copied ? "Copied" : "Copy name"}
              </span>
            </button>
          </div>

          {/*
            Stacked under the avatar rather than pinned to the bottom edge, so
            the identity and the facts about it read as one block.
          */}
          <dl className="flex flex-col gap-1.5 font-sans text-sm">
            <Fact label="Race" value={character.race} />
            {characterClass && <Fact label="Class" value={characterClass} />}
            <Fact
              label="Alignment"
              value={alignmentLabel(character.alignment)}
            />
            <Fact label="Level" value={character.level} />
          </dl>
        </div>

        {/*
          One positioned row, not two separately positioned corners. Sharing a
          line box is what actually puts "Retire" and the handle on the same
          baseline — two elements pinned to the same `bottom` only agree while
          their fonts and padding do. The inset matches the content padding
          above, so the label starts on the same vertical as the facts.

          Positioned rather than in the flow because the card's height comes
          from its 16:9 ratio: a flow row would ask for height the box has not
          got, and on a narrow card that is the difference between fitting and
          being clipped. `pointer-events-none` hands the gap between the two
          back to the stretched link underneath.
        */}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex items-center justify-between gap-3 font-display text-sm tracking-wide sm:inset-x-5 sm:bottom-5">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={isPending}
            aria-label={`Retire ${handle}`}
            // The same ink as the fact labels above it while it is only
            // sitting there, so a destructive control is not shouting from
            // every card on the page. The red arrives under the pointer, at
            // the moment it is a warning about what the click does rather than
            // a standing one. Both states clear AA against the scrim: 5.5:1 at
            // rest, 4.94:1 on hover.
            className="pointer-events-auto cursor-pointer text-ink/60 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-colors duration-300 hover:text-red-500"
          >
            Retire
          </button>

          <span className="text-gold/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            #{character.discriminator}
          </span>
        </div>

        {/*
          Stretched link: covers the card for pointer users while staying a
          single, properly labelled tab stop for keyboard users.
        */}
        <Link
          href={`/dashboard/character/${character.id}`}
          aria-label={`Open ${handle}`}
          className="absolute inset-0 cursor-pointer rounded-2xl"
        />
      </article>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {/*
        Announced politely rather than shown only as a hover label, so the
        result of the copy reaches someone who cannot see the tooltip.
      */}
      <span aria-live="polite" className="sr-only">
        {copied ? `${handle} copied to the clipboard` : ""}
      </span>

      <ConfirmDialog
        open={confirming}
        title={`Retire ${handle}?`}
        // "Retire" is the gentler word, but the dialog still has to be straight
        // about what happens: the row is deleted, not archived. Softening the
        // consequence as well as the label is how people lose work.
        description="Their sheet and everything on it is removed for good, and the slot opens up. This cannot be undone."
        confirmLabel="Retire character"
        pending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function Fact({ label, value }) {
  return (
    <div className="flex min-w-0 gap-2">
      {/*
        /60 rather than /45, and with the same halo the value carries. At 45%
        the label composited to 3.8–4.3:1 depending on what the animation was
        doing behind the glass — under AA at both ends of that range, on 14px
        text. /60 holds 5.5:1 at the brightest and 6.9:1 at the darkest.
      */}
      <dt className="text-ink/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {label}
      </dt>
      <dd className="truncate font-medium text-ink drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {value}
      </dd>
    </div>
  );
}
