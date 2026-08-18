"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import ConfirmDialog from "@/app/components/ui/confirm-dialog";
import {
  MAP_VIGNETTE_STYLE,
  surfaceClasses,
} from "@/app/components/ui/surface";

import { deleteCampaign } from "./actions";

/**
 * One campaign as a 16:9 tile, with its map behind it.
 *
 * Deliberately the same object as `CharacterCard`: the same `aspect-video
 * min-h-58 w-full` box and the note above it applies here word for word, the
 * same `rim-gold glow-gold` when there is artwork and real glass when there is
 * not, the same positioned corner row, the same stretched link, the same
 * ConfirmDialog. A campaign is a different subject, not a different kind of
 * tile.
 *
 * Where it parts company is the darkening over the artwork. A character card
 * washes from the lower left, giving its avatar and four facts a ground; a
 * campaign has a title and nothing else, and its map is worth seeing, so it
 * takes the symmetric vignette instead — the same one the campaign page's
 * thumbnail uses, from one definition in ui/surface.
 *
 * What it does not have is an avatar or a handle. A campaign has no initials
 * and nothing to copy, so those come out rather than being filled with
 * placeholders.
 *
 * The whole card is a link, and the delete control cannot live inside an
 * anchor — nested interactive elements are invalid HTML and a keyboard user
 * could never reach the inner one. So the link is a stretched overlay and the
 * button sits above it on a higher layer.
 */
export default function CampaignCard({ campaign }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const map = campaign.map_url;

  function handleConfirm() {
    // Clear whatever the last attempt said, so a message cannot outlive the
    // failure that produced it and sit under the dialog on every reopen.
    setError(null);

    startTransition(async () => {
      const result = await deleteCampaign(campaign.id);

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
          map
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
        {map && (
          /*
            next/image, and the reason is a measurement rather than a
            convention. This card is about 400px wide; the uploaded map is
            2560px and roughly 1.8MB, so a plain <img> spent that on every
            first view of the dashboard — around thirty times what the box can
            show. The optimiser serves a derivative cut to `sizes`, in AVIF or
            WebP by content negotiation, and caches it for a year.

            This file used to carry a plain <img> with a comment arguing that
            optimising it would mean baking a project URL into the build
            config. That was true and it was the wrong trade; the host is now
            read from the environment, which costs nothing and settles it.
          */
          <Image
            src={map}
            alt=""
            fill
            // Three across at desktop inside a 7xl container, two at tablet,
            // one on a phone — the same grid the character cards use, so the
            // same hint.
            sizes="(min-width: 1024px) 400px, (min-width: 768px) 45vw, 90vw"
            // objectFit has to come from the style object rather than the
            // Tailwind class: Next reads it from `style` to size its own
            // wrapper, and with the class alone the two disagree.
            style={{ objectFit: "cover" }}
            className="transition-transform duration-700 group-hover:scale-105"
          />
        )}

        {/*
          One darkening layer, not two. A corner-to-corner wash used to sit
          under this giving the title its ground, and the pair made the edges
          uneven — the lower left far darker than the rest. The vignette is
          strong enough to do both jobs, and the type has its own drop shadow.

          `pointer-events-none` because the whole card is a stretched link, and
          an overlay that swallowed clicks would make the tile dead. It also
          does not scale on hover: only the picture beneath moves, which is what
          makes the frame read as a frame.
        */}
        {map && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={MAP_VIGNETTE_STYLE}
          />
        )}

        {/* Where the character card puts its avatar row and facts. A campaign
            has only its title so far, and a label repeating the section
            heading above it is not a fact. */}
        <div className="relative flex h-full flex-col gap-2 p-4 sm:p-5">
          <h3 className="truncate font-display text-xl leading-tight font-semibold text-ink drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-colors duration-300 group-hover:text-gold">
            {campaign.title}
          </h3>
        </div>

        {/*
          The character card's corner row, with only the left half filled. The
          right one carried the handle, and a campaign has none — an "Open"
          label would only restate what the whole card already does.

          Positioned rather than in the flow because the height comes from the
          16:9 ratio, and `pointer-events-none` hands the gap back to the
          stretched link underneath.
        */}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex items-center justify-between gap-3 font-display text-sm tracking-wide sm:inset-x-5 sm:bottom-5">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={isPending}
            aria-label={`Delete ${campaign.title}`}
            // The same ink as the label above it while it is only sitting
            // there, so a destructive control is not shouting from every card
            // on the page. The red arrives under the pointer, at the moment it
            // is a warning about what the click does.
            className="pointer-events-auto cursor-pointer text-ink/60 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-colors duration-300 hover:text-red-500"
          >
            Delete
          </button>
        </div>

        {/*
          Stretched link: covers the card for pointer users while staying a
          single, properly labelled tab stop for keyboard users.
        */}
        <Link
          href={`/dashboard/campaign/${campaign.id}`}
          aria-label={`Open ${campaign.title}`}
          className="absolute inset-0 cursor-pointer rounded-2xl"
        />
      </article>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Delete ${campaign.title}?`}
        description="The campaign and its map are removed for good. This cannot be undone."
        confirmLabel="Delete campaign"
        pending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
