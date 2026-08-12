"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { alignmentLabel, characterHandle } from "sina/rules/character";

import Avatar from "@/app/components/ui/avatar";
import ConfirmDialog from "@/app/components/ui/confirm-dialog";

import { deleteCharacter } from "./actions";
import { raceImage } from "./character-presentation";

/**
 * One character as a 16:9 tile, with the artwork for their race behind it.
 *
 * The whole card is a link, but a delete button cannot live inside an anchor —
 * nested interactive elements are invalid HTML and a keyboard user could never
 * reach the inner control. So the link is a stretched overlay covering the
 * card, and the delete button sits above it on a higher layer.
 */
export default function CharacterCard({ character }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handle = characterHandle(character);
  const artwork = raceImage(character.race);

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
        className={`group relative aspect-video overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md focus-within:border-indigo-500 ${
          artwork
            ? "border-white/15 bg-neutral-900 hover:border-indigo-400"
            : "border-black/10 bg-white hover:border-indigo-500/60 dark:border-white/10 dark:bg-white/5"
        } ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        {artwork && (
          <Image
            src={artwork}
            alt=""
            fill
            // Three across at desktop inside a 4xl container, two at tablet,
            // one on a phone. Without this Next assumes full width and ships
            // a needlessly large file.
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        {/*
          No scrim over the artwork by request, so legibility rests entirely on
          the text's own shadow. That holds because the art is dark; a light
          piece would need this revisiting.
        */}
        <div
          className={`relative flex h-full flex-col justify-between p-4 ${
            artwork
              ? "text-white [text-shadow:0_1px_3px_rgb(0_0_0_/_0.9)]"
              : ""
          }`}
        >
          <div className="flex items-start gap-3">
            <Avatar name={character.name} colorTheme={character.color_theme} />

            <div className="min-w-0">
              <h3 className="truncate font-semibold tracking-tight drop-shadow-sm">
                {character.name}
              </h3>
              <p
                className={`truncate font-mono text-xs ${
                  artwork ? "text-white/70" : "text-neutral-500"
                }`}
              >
                {handle}
              </p>
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-4 gap-y-1 pr-12 text-xs">
            <Fact label="Level" value={character.level} muted={artwork} />
            <Fact label="Race" value={character.race} muted={artwork} />
            <Fact
              label="Alignment"
              value={alignmentLabel(character.alignment)}
              muted={artwork}
            />
          </dl>
        </div>

        {/*
          Stretched link: covers the card for pointer users while staying a
          single, properly labelled tab stop for keyboard users.
        */}
        <Link
          href={`/dashboard/character/${character.id}`}
          aria-label={`Open ${handle}`}
          className="absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        />

        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={isPending}
          aria-label={`Delete ${handle}`}
          className={`absolute right-3 bottom-3 z-10 rounded-lg p-2 transition hover:bg-red-500/20 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${
            artwork
              ? "text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              : "text-neutral-500 hover:text-red-600 dark:hover:text-red-400"
          }`}
        >
          <TrashIcon />
        </button>
      </article>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Delete ${handle}?`}
        description="This removes the character and everything on the sheet. It cannot be undone."
        confirmLabel="Delete character"
        pending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function Fact({ label, value, muted }) {
  return (
    <div className="flex min-w-0 gap-1.5">
      <dt className={muted ? "text-white/60" : "text-neutral-500"}>{label}</dt>
      <dd className="truncate font-medium drop-shadow-sm">{value}</dd>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
