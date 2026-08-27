"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { hexToPixel, pixelToHex } from "@/lib/hex-math";

import { useMapZoom } from "../use-map-zoom";

import { holdTray } from "./dice-engine";
import DragArrow from "./drag-arrow";
import HexGridOverlay from "./hex-grid-overlay";
import { HEAD_OF_TABLE } from "./dice-table";
import { useTableMaps } from "./table-maps";
import { useTableWire, useWireMessage } from "./table-wire";
import MapMarks, { MarkRoll } from "./map-marks";
import { MAP_MAX_HEIGHT_CLASS } from "./map-height";
import { useTableMarks } from "./use-table-marks";

/**
 * The board, and the two hands over it.
 *
 * THE WHEEL ZOOMS and the left button belongs to the pieces; a press that did
 * not start on one pans instead. The campaign sheet's modal still zooms on a
 * click, having nothing standing on it to fight for the press.
 *
 * The frame clips the zoom and shrink-wraps the picture, so the glass mat round
 * it stays the same rim at every size and the marks lie over it on a plain
 * `inset-0`. The entrance rides on the frame rather than the image, which is
 * already carrying the pan and the scale.
 *
 * THE RIGHT BUTTON IS A RULER: held down it measures, and letting go does
 * nothing. It exists so the rest of the table can watch — see `announce`.
 *
 * It also announces the picture's own size: the dice tray IS this picture, and
 * `naturalWidth` is a property of the file rather than of the box it is drawn
 * in, so it is the same pair of numbers in every chair. See dice-engine.js.
 *
 * NOT `memo`, and that is load-bearing here and in dice-board.jsx and
 * activity-log.jsx: a memoised client component rendered by a SERVER one is a
 * different element type on every RSC payload, so React remounts it on each
 * `router.refresh()`. It bought nothing either way — `faces` and `seat` are
 * built fresh in page.jsx, so the shallow compare never once held.
 */
export default function TableMap({
  url,
  title,
  campaignId,
  faces,
  seat,
  canSweep,
  className = "",
  style,
}) {
  const frameRef = useRef(null);
  const imageRef = useRef(null);

  /* The picture that WAS on the table, fading over the new one — which is
     already at full strength underneath. See `.map-leaving` in globals.css. */
  const [leaving, setLeaving] = useState(null);
  const standing = useRef(url);

  /* The picture's own size: the coordinate system the grid is ruled in. Never
     the box it is drawn in, which differs on every chair and at every step. */
  const [natural, setNatural] = useState(null);

  /* The cell under the pointer while a token is being carried, so whoever is
     carrying it can see where it will land before letting go. */
  const [hover, setHover] = useState(null);

  /* A piece lifted off the board and not yet put down. The palette's selection
     is the other way in — see `carrying`, which is either of them. */
  const [lifted, setLifted] = useState(null);

  const { activeId, grid, holding, hold } = useTableMaps();

  const { marks, ownMark, mayPlaceOwn, place, clear } = useTableMarks({
    campaignId,
    mapId: activeId,
    ruled: grid.enabled,
    faces,
    seat,
    canSweep,
  });

  const { send } = useTableWire();

  /* The ruler: where the right button was pressed, and nothing else. */
  const [measure, setMeasure] = useState(null);

  /* Everybody else's arrows, by seat. Two whole cells off the wire, turned
     back into points from this board's own grid. */
  const [aims, setAims] = useState({});

  useWireMessage(
    "aim",
    useCallback((message) => {
      const at = typeof message.seat === "string" ? message.seat : null;

      if (!at) {
        return;
      }

      setAims((standing) => {
        if (!cell(message.from) || !cell(message.to)) {
          const { [at]: gone, ...rest } = standing;

          return gone === undefined ? standing : rest;
        }

        return { ...standing, [at]: { from: message.from, to: message.to } };
      });
    }, []),
  );

  useEffect(() => {
    if (standing.current === url) {
      return;
    }

    setLeaving(standing.current);
    standing.current = url;
  }, [url]);

  /**
   * WHAT IS IN THE HAND: lifted off the board, or picked out of the palette.
   * One thing carried, so the arrow, the lit cell and the drop are written
   * once. `from` is null for a piece that has never been put down.
   */
  const carrying = useMemo(
    () =>
      lifted ??
      (holding === null
        ? null
        : {
            characterId: holding,
            from: marks.find((mark) => mark.characterId === holding) ?? null,
          }),
    [holding, lifted, marks],
  );

  /**
   * A point pulled onto the nearest cell centre. Free placement is locked while
   * the grid is up — that is what a grid is for. Off it, passed through.
   */
  const snap = useCallback(
    (point) => {
      if (!point || !grid.enabled || !natural) {
        return point;
      }

      const cell = pixelToHex(
        point.x * natural.width,
        point.y * natural.height,
        grid.size,
      );

      const centre = hexToPixel(cell.q, cell.r, grid.size);

      return {
        x: centre.x / natural.width,
        y: centre.y / natural.height,
        q: cell.q,
        r: cell.r,
      };
    },
    [grid.enabled, grid.size, natural],
  );

  /**
   * A left click on bare map. A piece in the hand goes down there; otherwise a
   * chair with nothing on the board puts its own out. A chair that already has
   * one gets nothing — from then on it is moved by dragging, or every stray
   * click would teleport it.
   */
  const onTap = useCallback(
    (point) => {
      if (!point || !place) {
        return false;
      }

      if (holding !== null) {
        place(snap(point), holding);
        setHover(null);
        hold(null);

        return true;
      }

      if (mayPlaceOwn && !ownMark) {
        place(snap(point));

        return true;
      }

      return false;
    },
    [hold, holding, mayPlaceOwn, ownMark, place, snap],
  );

  const { zoomed, frameProps, imageStyle, scale, pointAt } = useMapZoom({
    frameRef,
    imageRef,
    // Turn to zoom, about whatever is under the pointer.
    wheel: true,
    // And not on a click: that press is a token's.
    pointerZoom: false,
    onTap,
  });

  /**
   * This chair's arrow, told to the table — and only when it reaches a
   * different CELL. A pointer fires dozens of moves a second, and a message
   * per move is a socket carrying nothing anybody could see.
   */
  const told = useRef(null);

  const announce = useCallback(
    (from, to) => {
      const next = from && to ? `${from.q},${from.r}:${to.q},${to.r}` : null;

      if (told.current === next) {
        return;
      }

      told.current = next;

      send({
        kind: "aim",
        seat: seat?.characterId ?? HEAD_OF_TABLE,
        from: from && { q: from.q, r: from.r },
        to: to && { q: to.q, r: to.r },
      });
    },
    [seat, send],
  );

  /* Kept current without the effect below naming them: `pointAt` is rebuilt on
     every render, so it as a dependency would resubscribe on every move. */
  const latest = useRef(null);

  useEffect(() => {
    latest.current = { pointAt, snap, place, clear, marks, announce };
  });

  /**
   * The lit cell under a moving hand. Compared rather than assigned, or the
   * board re-renders on every move and stutters while somebody aims.
   */
  const aimAt = useCallback((event) => {
    const { pointAt: at, snap: pull } = latest.current;
    const point = pull(at(event));

    /* THE WHOLE POINT, not just the cell: the lit hexagon needs `q,r` but the
       arrow is drawn from coordinates, and a `to` without them is a line of
       NaNs — invisible, while the distance beside it still reads right. */
    setHover((standing) =>
      standing?.q === point?.q && standing?.r === point?.r
        ? standing
        : (point ?? null),
    );

    return point;
  }, []);

  /**
   * A HAND ON THE BOARD, until it is taken off again. On the document, because
   * a drag that left the board still has to be answered: dropped outside, a
   * lifted piece goes back and a palette selection stays in the hand.
   *
   * One set of listeners for both hands. The ruler puts nothing down, and a
   * piece pressed but never carried is a CLICK, which lifts it off.
   */
  useEffect(() => {
    const hand = carrying ?? measure;

    if (!hand) {
      return undefined;
    }

    function follow(event) {
      const point = aimAt(event);
      const anchor = carrying ? carrying.from : measure.from;

      latest.current.announce(anchor && latest.current.snap(anchor), point);
    }

    function release(event) {
      const {
        pointAt: at,
        snap: pull,
        place: put,
        clear: lift,
      } = latest.current;

      if (measure) {
        // A ruler measures and lets go. Nothing moves.
        setMeasure(null);
      } else {
        const point = pull(at(event));
        const travelled =
          Math.hypot(
            event.clientX - carrying.origin.clientX,
            event.clientY - carrying.origin.clientY,
          ) > TAP_SLOP_PX;

        if (!travelled && lifted) {
          // Pressed and released on the spot: a click, which lifts it off.
          const standing = latest.current.marks.find(
            (mark) => mark.characterId === carrying.characterId,
          );

          if (standing?.removable) {
            lift(carrying.characterId);
          }
        } else if (point) {
          put(point, carrying.characterId);
          hold(null);
        }

        setLifted(null);
      }

      latest.current.announce(null, null);
      setHover(null);
    }

    document.addEventListener("pointermove", follow);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);

    return () => {
      document.removeEventListener("pointermove", follow);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
    };
  }, [aimAt, carrying, hold, lifted, measure]);

  /* `onLoad` below never fires for a picture that was already in the cache when
     this mounted, and that is the common case on the second visit. */
  useEffect(() => {
    const image = imageRef.current;

    if (image?.complete && image.naturalWidth) {
      holdTray(image.naturalWidth, image.naturalHeight);
      setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    }
  }, [url]);

  /* The ruler is a held right button, so the menu under it is refused — over
     the picture and on a ruled board only. */
  function onContextMenu(event) {
    if (grid.enabled && pointAt(event)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <div
        ref={frameRef}
        aria-label={`Map of ${title}. ${zoomed ? "Zoomed in" : "Zoomed out"}.`}
        {...frameProps}
        onContextMenu={onContextMenu}
        onPointerDown={(event) => {
          // The ruler, and only on a ruled board: what it measures is cells.
          if (event.button === 2 && grid.enabled) {
            const from = snap(pointAt(event));

            if (from) {
              event.preventDefault();
              setMeasure({ from });

              // The whole point, for the reason `aimAt` keeps it.
              setHover(from);
            }

            return;
          }

          frameProps.onPointerDown?.(event);
        }}
        onPointerMove={(event) => {
          frameProps.onPointerMove?.(event);

          if (holding === null || !grid.enabled) {
            return;
          }

          aimAt(event);
        }}
        onPointerLeave={() => {
          if (!carrying && !measure) {
            setHover(null);
          }
        }}
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
          onLoad={(event) => {
            holdTray(event.target.naturalWidth, event.target.naturalHeight);
            setNatural({
              width: event.target.naturalWidth,
              height: event.target.naturalHeight,
            });
          }}
        />

        {/* The one it replaced, pinned over the box the new one just sized and
            fading out of it. `object-cover` rather than `contain`: two maps are
            rarely the same shape, and a picture that letterboxes on its way out
            reads as the frame moving rather than the map changing. */}
        {leaving && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={leaving}
            alt=""
            aria-hidden="true"
            draggable={false}
            onAnimationEnd={() => setLeaving(null)}
            className="map-leaving pointer-events-none absolute inset-0 size-full object-cover"
          />
        )}

        {grid.enabled && natural && (
          <HexGridOverlay
            width={natural.width}
            height={natural.height}
            size={grid.size}
            luminance={grid.luminance}
            hover={hover}
            layerStyle={imageStyle}
          />
        )}

        {/* This chair's own arrow: a carried piece, or the ruler. */}
        {natural && hover && (carrying?.from || measure) && (
          <DragArrow
            width={natural.width}
            height={natural.height}
            // A stored point is already at a centre; `snap` names which.
            from={snap(measure ? measure.from : carrying.from)}
            to={hover}
            size={grid.enabled ? grid.size : natural.width / 40}
            scale={scale}
            layerStyle={imageStyle}
          />
        )}

        {/* And everybody else's, drawn from the cells they named. */}
        {natural &&
          grid.enabled &&
          Object.entries(aims).map(([at, beam]) => (
            <DragArrow
              key={at}
              width={natural.width}
              height={natural.height}
              from={pointOfCell(beam.from, grid.size, natural)}
              to={pointOfCell(beam.to, grid.size, natural)}
              size={grid.size}
              scale={scale}
              layerStyle={imageStyle}
            />
          ))}

        <MapMarks
          marks={marks}
          scale={scale}
          layerStyle={imageStyle}
          // As a fraction of the layer, so it scales with the board.
          cell={
            grid.enabled && natural
              ? (TOKEN_OF_A_CELL * grid.size) / natural.width
              : null
          }
          /* Where the press began travels with it: a press that goes nowhere
             is a click, and a click lifts the piece off. */
          onGrab={
            place
              ? (characterId, event) =>
                  setLifted({
                    characterId,
                    origin: { clientX: event.clientX, clientY: event.clientY },
                    from:
                      marks.find((mark) => mark.characterId === characterId) ??
                      null,
                  })
              : null
          }
        />
      </div>

      <MarkRoll marks={marks} />
    </>
  );
}

/**
 * How much of a cell a piece covers. NOT all of it: a hexagon is `sqrt(3)`
 * radii across the flats, so a full-diameter disc sits over its own outline.
 */
const TOKEN_OF_A_CELL = 1.4;

/** How far a press may drift and still be a click rather than a carry. */
const TAP_SLOP_PX = 4;

/** A cell off the wire, believed only as far as its shape. */
function cell(value) {
  return Boolean(
    value && Number.isInteger(value.q) && Number.isInteger(value.r),
  );
}

/** And the point it names, in this board's own fractions. */
function pointOfCell(named, size, natural) {
  const { x, y } = hexToPixel(named.q, named.r, size);

  return {
    x: x / natural.width,
    y: y / natural.height,
    q: named.q,
    r: named.r,
  };
}
