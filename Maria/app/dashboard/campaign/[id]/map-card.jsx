"use client";

import { useRef, useState } from "react";

import { surfaceClasses } from "@/app/components/ui/surface";
import { changeCampaignMap } from "@/app/actions/campaign-maps";
import { compressMap } from "@/lib/image-compression";

import {
  MAP_ACCEPT_ATTRIBUTE,
  MAX_MAP_BYTES,
  formatBytes,
} from "sina/rules/campaign";
import { sceneDownloadUrl } from "sina/rules/scene";

/**
 * One map, as a card: the picture at 16:9 under a vignette, its name in the
 * top-left corner, and the way to swap the picture in the bottom-right — or,
 * for a painted scene, to download it.
 *
 * ONE COMPONENT FOR TWO PLACES: the maps tab manages the shelf, the switcher
 * puts one on the board. A card with an `onChoose` is a control, one without is
 * a listing. `[Change]` is a SIBLING of the card's button, not nested in it —
 * a button inside a button is not a button any more.
 */
export default function MapCard({
  campaignId,
  map,
  active = false,
  onChoose = null,
  onChanged = null,
  changeable = true,
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const inputRef = useRef(null);

  async function change(file) {
    if (!file) {
      return;
    }

    setProblem(null);
    setBusy(true);

    try {
      const result = await compressMap(file, MAX_MAP_BYTES);

      if (result.decodable === false) {
        setProblem("That file could not be read as an image.");
        return;
      }

      if (result.file.size > MAX_MAP_BYTES) {
        setProblem(
          `That map is ${formatBytes(result.file.size)} even after compression, over the ${formatBytes(MAX_MAP_BYTES)} limit.`,
        );
        return;
      }

      const body = new FormData();

      body.set("map", result.file);

      const answer = await changeCampaignMap(campaignId, map.id, body);

      if (answer?.kind === "rejected") {
        setProblem(answer.message);
        return;
      }

      // The URL carries a fresh name, so no cache has to be told anything.
      onChanged?.(answer.url);
    } finally {
      setBusy(false);

      // Or the same file picked twice in a row fires no `change` event.
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const frame = active
    ? "border-gold ring-2 ring-gold shadow-[0_0_12px_var(--gold-55)]"
    : "border-gold/20 hover:border-gold/60";

  return (
    <div
      className={surfaceClasses({
        className: `group relative overflow-hidden rounded-xl border transition duration-300 ${frame}`,
      })}
    >
      {/* A listing card has no button at all rather than a disabled one. */}
      {onChoose ? (
        <button
          type="button"
          onClick={() => onChoose(map)}
          aria-pressed={active}
          aria-label={
            active
              ? `${map.name}, on the table`
              : `Put ${map.name} on the table`
          }
          className="block w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <Picture map={map} />
        </button>
      ) : (
        <Picture map={map} />
      )}

      {/* `pointer-events-none`, or it stands between the pointer and the card.
          Not on a painted scene: its name is only its map's plus "· scene",
          and the picture is the better label. The buttons still say it. */}
      {!map.is_scene && (
        <span className="pointer-events-none absolute top-2 left-2 max-w-[70%] truncate rounded-md border border-gold/25 bg-surface/85 px-2 py-1 font-display text-xs font-semibold tracking-wide text-gold">
          {map.name}
        </span>
      )}

      {(map.is_world_map || map.is_scene) && (
        <span className="pointer-events-none absolute top-2 right-2 rounded-md border border-gold/20 bg-surface/80 px-2 py-1 font-mono text-[0.625rem] tracking-[0.16em] text-ink/60 uppercase">
          {map.is_scene ? "Scene" : "World"}
        </span>
      )}

      {/* A label wrapping a file input: the input is the control. A painted
          scene has no Change: a new one is painted instead. */}
      {changeable && (
        <label
          className={`absolute right-2 bottom-2 rounded-lg border border-gold/40 bg-surface/85 px-2.5 py-1 font-display text-[0.6875rem] font-semibold tracking-[0.14em] text-gold uppercase transition duration-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold ${
            busy
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:border-gold/70 hover:bg-gold/15"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={MAP_ACCEPT_ATTRIBUTE}
            disabled={busy}
            onChange={(event) => change(event.target.files?.[0])}
            className="sr-only"
          />
          {busy ? "Working…" : "Change"}
        </label>
      )}

      {map.is_scene && (
        <a
          href={sceneDownloadUrl(map.url, map.name)}
          download
          aria-label={`Download ${map.name}`}
          title="Download"
          className="absolute right-2 bottom-2 grid size-7 place-items-center rounded-lg border border-gold/40 bg-surface/85 text-gold transition duration-300 hover:border-gold/70 hover:bg-gold/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M8 2.5v7.5M4.75 6.75 8 10l3.25-3.25M3 13.5h10" />
          </svg>
        </a>
      )}

      {problem && (
        <p
          role="alert"
          className="absolute inset-x-2 bottom-10 rounded-md bg-surface/90 px-2 py-1 text-xs text-red-400"
        >
          {problem}
        </p>
      )}
    </div>
  );
}

/** 16:9 whatever the file is, or the grid has holes in it. `object-cover`
    crops rather than letterboxes: a map is recognised by its middle. */
function Picture({ map }) {
  return (
    <span className="relative block aspect-video w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={map.url}
        alt={map.name}
        loading="lazy"
        decoding="async"
        className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* The vignette, so the badge and the button have a ground. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--surface-55)_100%)]"
      />
    </span>
  );
}
