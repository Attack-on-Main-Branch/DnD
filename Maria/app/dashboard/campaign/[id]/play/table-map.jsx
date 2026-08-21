"use client";

import { useRef } from "react";

import { useMapZoom } from "../use-map-zoom";

import MapMarks, { MarkRoll } from "./map-marks";
import { MAP_MAX_HEIGHT_CLASS } from "./map-height";
import { useTableMarks } from "./use-table-marks";

/**
 * The board. Same zoom as the campaign sheet's modal — one click in, drag or
 * arrow keys to travel, one click out — over a frame sized the table's way.
 *
 * The frame clips the zoom and shrink-wraps the picture, so the glass mat round
 * it stays the same rim at every size and the marks lie over it on a plain
 * `inset-0`. The entrance rides on the frame rather than the image, which is
 * already carrying the pan and the scale.
 *
 * Right-click puts a token down: the left button zooms, and held it pans.
 */
export default function TableMap({
  url,
  title,
  campaignId,
  marks: placed,
  seat,
  canSweep,
  className = "",
  style,
}) {
  const frameRef = useRef(null);
  const imageRef = useRef(null);

  const { zoomed, frameProps, imageStyle, scale, pointAt, hint } = useMapZoom({
    frameRef,
    imageRef,
  });

  const { marks, place, clear, error } = useTableMarks({
    campaignId,
    marks: placed,
    seat,
    canSweep,
  });

  function onContextMenu(event) {
    if (!place) {
      return;
    }

    const point = pointAt(event);

    // Off the picture and onto the frame beside it, which is no place on the
    // map — the browser's own menu is left to open there.
    if (!point) {
      return;
    }

    event.preventDefault();
    place(point);
  }

  return (
    <>
      <div
        ref={frameRef}
        aria-label={`Map of ${title}. ${zoomed ? "Zoomed in" : "Zoomed out"}.`}
        {...frameProps}
        onContextMenu={onContextMenu}
        style={style}
        // `touch-none` so a drag on a touchscreen pans the map instead of
        // scrolling the page out from under it.
        className={`group relative w-fit touch-none overflow-hidden rounded-xl select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70 ${
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        } ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={url}
          alt={`Map of ${title}`}
          fetchPriority="high"
          // Without this the browser starts its own image drag on mousedown,
          // which cancels the pan before it begins.
          draggable={false}
          className={`block max-w-full ${MAP_MAX_HEIGHT_CLASS}`}
          style={imageStyle}
        />

        {/* The instruction, over the map rather than under it: a line of its
            own would push the health bar down on every screen for a sentence
            only useful before the first click. Announced either way — it is the
            only thing telling a keyboard user the arrows do anything. A refused
            write speaks here too, and holds the line open while it does. */}
        <span
          aria-live="polite"
          className={`pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-3 pt-6 pb-2 text-center font-mono text-[10px] tracking-[0.2em] uppercase transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none ${
            error ? "text-red-300 opacity-100" : "text-ink/70 opacity-0"
          }`}
        >
          {error ?? (place ? `${hint} · right-click to mark` : hint)}
        </span>

        {/* Last, so a token near the foot of the map is not dimmed by the
            gradient behind that line. */}
        <MapMarks
          marks={marks}
          scale={scale}
          layerStyle={imageStyle}
          onClear={clear}
        />
      </div>

      <MarkRoll marks={marks} />
    </>
  );
}
