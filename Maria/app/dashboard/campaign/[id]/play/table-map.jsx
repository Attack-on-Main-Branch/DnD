"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { hexToPixel, pixelToHex } from "@/lib/hex-math";

import { useMapZoom } from "../use-map-zoom";

import { holdTray } from "./dice-engine";
import DragArrow, { DragDistance } from "./drag-arrow";
import FogOverlay from "./fog-overlay";
import HexGridOverlay from "./hex-grid-overlay";
import { HEAD_OF_TABLE } from "./dice-table";
import { useTableMaps } from "./table-maps";
import { useTableWire, useWireMessage } from "./table-wire";
import MapTokens, { TokenRoll } from "./map-tokens";
import { diceColorHex } from "@/app/dashboard/character-presentation";
import { MAP_MAX_HEIGHT_CLASS } from "./map-height";
import { useMapTokens } from "./use-map-tokens";

/**
 * The board, and the two hands over it.
 *
 * THE WHEEL ZOOMS and the left button belongs to the pieces; a press that did
 * not start on one pans instead. The campaign sheet's modal still zooms on a
 * click, having nothing standing on it to fight for the press.
 *
 * The frame clips the zoom and shrink-wraps the picture, so the glass mat round
 * it stays the same rim at every size and the pieces lie over it on a plain
 * `inset-0`. The entrance rides on the frame rather than the image, which is
 * already carrying the pan and the scale.
 *
 * THE RIGHT BUTTON IS A RULER over bare map, and the piece's own menu over a
 * piece — see map-token.jsx, which stops the press before it reaches here. Held
 * down the ruler measures, and letting go does nothing. It exists so the rest of
 * the table can watch — see `announce`.
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

  /* The cell under the pointer while a piece is being carried, so whoever is
     carrying it can see where it will land before letting go. */
  const [hover, setHover] = useState(null);

  /* A piece lifted off the board and not yet put down. The palette's selection
     is the other way in — see `carrying`, which is either of them. */
  const [lifted, setLifted] = useState(null);

  /* A brush on the board. State because it arms the listeners below; where it
     last stamped is a ref, moving thirty times a second. */
  const [stroking, setStroking] = useState(false);
  const strokeAt = useRef(null);

  const {
    activeId,
    isWorldMap,
    grid,
    holding,
    hold,
    fog,
    brush,
    fogSize,
    paintFog,
    mask,
    reportNatural,
  } = useTableMaps();

  const { tokens, ownToken, ownPiece, place, move, lift, mark } = useMapTokens({
    campaignId,
    mapId: activeId,
    isWorldMap,
    ruled: grid.enabled,
    faces,
    seat,
    canSweep,
  });

  const { send } = useTableWire();

  /* The ruler: where the right button was pressed, and nothing else. */
  const [measure, setMeasure] = useState(null);

  /* Everybody else's arrows, by seat. A ruled board names cells and an unruled
     one names points; `anchorOf` takes whichever it can use. */
  const [aims, setAims] = useState({});

  useWireMessage(
    "aim",
    useCallback((message) => {
      const at = typeof message.seat === "string" ? message.seat : null;

      if (!at) {
        return;
      }

      setAims((standing) => {
        if (!aimed(message.from) || !aimed(message.to)) {
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
   * once.
   *
   * `token` is the row it came from and null for a piece that has never been
   * put down — which is what decides whether letting go MOVES or PLACES. A
   * character's face and the party's marker are one to a map, so picking either
   * out of the palette while it is already on the board picks THAT one up; an
   * invented piece is dealt fresh every time, which is the point of having it.
   */
  const carrying = useMemo(() => {
    if (lifted) {
      return lifted;
    }

    if (!holding) {
      return null;
    }

    const already =
      holding.kind === "template"
        ? null
        : (tokens.find((token) =>
            holding.kind === "party"
              ? token.isPartyMarker
              : token.characterId === holding.characterId,
          ) ?? null);

    return { piece: holding, token: already, from: already };
  }, [holding, lifted, tokens]);

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

  /* `onTap` runs from the FRAME'S own pointerup, and the document listener
     further down is about to see that same event: without this the hand is put
     down twice, which for an invented piece means two of it on the board. */
  const handled = useRef(false);

  /** Letting go, wherever the hand happens to be holding something from. */
  const put = useCallback(
    (hand, point) => {
      if (hand.token) {
        move?.(hand.token.id, point);
      } else {
        place?.(point, hand.piece);
      }
    },
    [move, place],
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

      if (holding) {
        put(carrying, snap(point));
        setHover(null);
        hold(null);
        handled.current = true;

        return true;
      }

      if (ownPiece && !ownToken) {
        place(snap(point), ownPiece);

        return true;
      }

      return false;
    },
    [carrying, hold, holding, ownPiece, ownToken, place, put, snap],
  );

  const { zoomed, frameProps, imageStyle, scale, pointAt } = useMapZoom({
    frameRef,
    imageRef,
    // Turn to zoom, about whatever is under the pointer.
    wheel: true,
    // And not on a click: that press is a piece's.
    pointerZoom: false,
    /* NOT A KEYBOARD CONTROL. The board answered Space, Enter and the four
       arrows, which is a surprise on a surface whose whole job is where a
       pointer lands — and being a `role="button"` to do it hid every piece on
       it from a screen reader. The modal on the campaign sheet keeps both. */
    keyboard: false,
    onTap,
  });

  /**
   * This chair's arrow, told to the table. A pointer fires dozens of moves a
   * second, so a ruled board speaks only when the hand reaches a different
   * CELL — and an unruled one, which has no cells to wait for, no more often
   * than AIM_QUIET_MS.
   */
  const told = useRef(null);
  const spoke = useRef(0);

  const announce = useCallback(
    (from, to) => {
      const ruled = cell(from) && cell(to);
      const next =
        !from || !to
          ? null
          : ruled
            ? `${from.q},${from.r}:${to.q},${to.r}`
            : `${to.x.toFixed(4)},${to.y.toFixed(4)}`;

      if (told.current === next) {
        return;
      }

      const now = Date.now();

      if (next && !ruled && now - spoke.current < AIM_QUIET_MS) {
        return;
      }

      told.current = next;
      spoke.current = now;

      send({
        kind: "aim",
        seat: seat?.characterId ?? HEAD_OF_TABLE,
        from: from && named(from),
        to: to && named(to),
      });
    },
    [seat, send],
  );

  /* Kept current without the effect below naming them: `pointAt` is rebuilt on
     every render, so it as a dependency would resubscribe on every move. */
  const latest = useRef(null);

  useEffect(() => {
    latest.current = {
      pointAt,
      snap,
      put,
      announce,
      paintFog,
      brush,
      fogSize,
    };
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
      settled(standing, point) ? standing : (point ?? null),
    );

    return point;
  }, []);

  /**
   * A HAND ON THE BOARD, until it is taken off again. On the document, because
   * a drag that left the board still has to be answered: dropped outside, a
   * lifted piece goes back and a palette selection stays in the hand.
   *
   * One set of listeners for both hands. The ruler puts nothing down, and a
   * piece pressed but never carried does nothing at all — taking one off the
   * board is the menu's, and only the menu's.
   */
  useEffect(() => {
    const hand = carrying ?? measure;

    if (!hand) {
      return undefined;
    }

    function follow(event) {
      const point = aimAt(event);

      /* A HIDDEN PIECE DRAGS IN SILENCE. Its row is withheld from every player,
         so an arrow tracking it across their board would be the one thing that
         gave it away. The head of the table still sees their own. */
      if (carrying?.token?.isHidden) {
        return;
      }

      const anchor = carrying ? carrying.from : measure.from;

      latest.current.announce(anchor && latest.current.snap(anchor), point);
    }

    function release(event) {
      const { pointAt: at, snap: pull } = latest.current;

      if (measure) {
        // A ruler measures and lets go. Nothing moves.
        setMeasure(null);
      } else if (handled.current) {
        // The frame's own pointerup already put this down — see `onTap`.
        setLifted(null);
      } else {
        const point = pull(at(event));

        /* A piece picked out of the PALETTE has no origin: the press that chose
           it happened on the rail, so its release is always a placement. */
        const travelled =
          !carrying.origin ||
          Math.hypot(
            event.clientX - carrying.origin.clientX,
            event.clientY - carrying.origin.clientY,
          ) > TAP_SLOP_PX;

        /* A PRESS THAT WENT NOWHERE NOW DOES NOTHING. It used to lift the piece
           off the board, which meant every misjudged drag — and every press
           that only meant to check what a piece was — took a token off. It
           comes off through the menu instead: see token-menu.jsx. */
        if (travelled && point) {
          latest.current.put(carrying, point);
          hold(null);
        }

        setLifted(null);
      }

      handled.current = false;
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

  /**
   * On the document rather than the frame, as the piece-carrying hand above is:
   * a stroke that runs off the edge of the map is still a stroke.
   *
   * THE RELEASE ENDS THE STROKE AND WRITES NOTHING. The mask reaches the bucket
   * when the BRUSH is put down — see `takeBrush` in table-maps.jsx.
   */
  useEffect(() => {
    if (!stroking) {
      return undefined;
    }

    function follow(event) {
      const at = latest.current;
      const point = at.pointAt(event);

      if (!point) {
        return;
      }

      at.paintFog(strokeAt.current, point, at.brush, at.fogSize);
      strokeAt.current = point;
    }

    function release() {
      strokeAt.current = null;
      setStroking(false);
    }

    document.addEventListener("pointermove", follow);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);

    return () => {
      document.removeEventListener("pointermove", follow);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
    };
  }, [stroking]);

  /* `onLoad` below never fires for a picture that was already in the cache when
     this mounted, and that is the common case on the second visit. */
  useEffect(() => {
    const image = imageRef.current;

    if (image?.complete && image.naturalWidth) {
      const size = { width: image.naturalWidth, height: image.naturalHeight };

      holdTray(size.width, size.height);
      setNatural(size);
      // The mask is held in the provider and wants this picture's ratio.
      reportNatural(size);
    }
  }, [reportNatural, url]);

  /**
   * EVERY ARROW ON THE BOARD, this chair's and the rest, worked out once so the
   * line and the figure over it are drawn from the same pair of points.
   *
   * A CHAIR'S OWN DICE COLOUR, which is what marks everything else a person does
   * at this table. The head of the table rolls the house's dice and has none, so
   * theirs is gold — the colour that chair already wears everywhere else.
   */
  const beams = useMemo(() => {
    if (!natural) {
      return [];
    }

    const drawn = [];

    // The ruler measures for whoever is holding it; a carried piece points from
    // where it stands. A stored point is already at a centre; `snap` names it.
    if (hover && (carrying?.from || measure)) {
      drawn.push({
        key: "mine",
        from: snap(measure ? measure.from : carrying.from),
        to: hover,
        color: seatColor(seat, faces),
      });
    }

    // And everybody else's, from the cell they named on a ruled board or the
    // point they named on one without lines.
    for (const [at, beam] of Object.entries(aims)) {
      const from = anchorOf(beam.from, grid.enabled, grid.size, natural);
      const to = anchorOf(beam.to, grid.enabled, grid.size, natural);

      if (from && to) {
        drawn.push({ key: at, from, to, color: chairColor(at, faces) });
      }
    }

    return drawn;
  }, [
    aims,
    carrying,
    faces,
    grid.enabled,
    grid.size,
    hover,
    measure,
    natural,
    seat,
    snap,
  ]);

  /* The ruler is a held right button, so the menu under it is refused — over
     the picture and on a ruled board only. A press that started on a PIECE
     never reaches this: map-token.jsx stops both halves. */
  function onContextMenu(event) {
    if (grid.enabled && pointAt(event)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <div
        ref={frameRef}
        {...frameProps}
        onContextMenu={onContextMenu}
        onPointerDown={(event) => {
          /* THE BRUSH OUTRANKS EVERYTHING: it takes the press before the pan,
             the pieces and the ruler have a chance at it. */
          if (brush && event.button === 0 && event.isPrimary) {
            const point = pointAt(event);

            if (point) {
              event.preventDefault();

              strokeAt.current = point;
              paintFog(null, point, brush, fogSize);
              setStroking(true);
            }

            return;
          }

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

          if (!holding) {
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
        /* NO MAGNIFIER. A click on the board does not zoom — the wheel does —
           so a cursor promising one was pointing at a control that is not
           there. Zoomed in it is a hand, because then it pans. */
        className={`group relative w-fit touch-none overflow-hidden rounded-xl select-none ${
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-default"
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
            const size = {
              width: event.target.naturalWidth,
              height: event.target.naturalHeight,
            };

            holdTray(size.width, size.height);
            setNatural(size);
            reportNatural(size);
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

        {/* UNDER THE PIECES: an arrow across a crowded board runs behind the
            faces rather than over them. The figures go over — see below. */}
        {beams.map((beam) => (
          <DragArrow
            key={beam.key}
            width={natural.width}
            height={natural.height}
            from={beam.from}
            to={beam.to}
            // The cell, ruled or not — the piece it points at is that size too.
            size={grid.size}
            color={beam.color}
            layerStyle={imageStyle}
          />
        ))}

        <MapTokens
          tokens={tokens}
          scale={scale}
          layerStyle={imageStyle}
          /* Deaf while a brush is held, or the first piece the stroke crosses
             swallows the press. */
          muted={Boolean(brush)}
          /* As a fraction of the layer, so it scales with the board.
             FROM `grid.size` WHETHER OR NOT THE GRID IS DRAWN. The ruling is a
             thing you can see; the scale it sets is a thing the map HAS, and a
             piece that changed size when the lines were switched off was the
             board telling you the world had resized. Null only until the
             picture has reported how big it is. */
          cell={natural ? (TOKEN_OF_A_CELL * grid.size) / natural.width : null}
          /* Where the press began travels with it: a press that goes nowhere
             is not a drag, and now does nothing at all. */
          onGrab={
            place
              ? (token, event) =>
                  setLifted({
                    piece: pieceOf(token),
                    token,
                    from: token,
                    origin: { clientX: event.clientX, clientY: event.clientY },
                  })
              : null
          }
          onMark={mark ? (token, patch) => mark(token, patch) : null}
          onLift={lift ? (token) => lift(token.id) : null}
        />
        {/* AND THE DISTANCES OVER THEM. A move of one cell puts the midpoint
            of the arrow on the piece that is moving, so the figure was drawn
            behind a face; nothing but tree order lifts it clear. */}
        {beams.map((beam) => (
          <DragDistance
            key={beam.key}
            width={natural.width}
            height={natural.height}
            from={beam.from}
            to={beam.to}
            size={grid.size}
            layerStyle={imageStyle}
          />
        ))}

        {/* LAST, AND OVER EVERYTHING: a piece standing in a room nobody has
            opened is part of what the darkness is hiding. */}
        {fog.enabled && (
          <FogOverlay
            maskRef={mask.maskRef}
            subscribe={mask.subscribe}
            seeThrough={canSweep}
            style={imageStyle}
          />
        )}
      </div>

      <TokenRoll tokens={tokens} />
    </>
  );
}

/**
 * How much of a cell a piece covers. NOT all of it: a hexagon is `sqrt(3)`
 * radii across the flats, so a full-diameter disc sits over its own outline.
 */
const TOKEN_OF_A_CELL = 1.4;

/** How far a press may drift and still be a click rather than a carry. */
/** How often an unruled board may say where a hand is pointing. */
const AIM_QUIET_MS = 80;

const TAP_SLOP_PX = 4;

/** A piece already on the board, described the way the palette describes one. */
function pieceOf(token) {
  if (token.isPartyMarker) {
    return { kind: "party" };
  }

  return token.characterId
    ? { kind: "character", characterId: token.characterId }
    : { kind: "template", templateId: token.templateId };
}

/**
 * Whether a moving hand is still where it was.
 *
 * ON A RULED BOARD that is the CELL: a pointer fires dozens of moves a second
 * and the board would re-render on every one of them, which is what made
 * aiming stutter.
 *
 * OFF IT, THE POINT ITSELF — and this is what was missing. Comparing `q` and
 * `r` on a board that has none is `undefined === undefined` on both, so every
 * move read as "still there", the hover was never set, and the arrow had no far
 * end to be drawn to. Free placement re-renders per move because free placement
 * has no coarser answer.
 */
function settled(standing, point) {
  if (!standing || !point) {
    return standing === point;
  }

  return Number.isInteger(standing.q) && Number.isInteger(point.q)
    ? standing.q === point.q && standing.r === point.r
    : standing.x === point.x && standing.y === point.y;
}

/**
 * The colour a chair draws in. Gold for the head of the table, whose seat has no
 * dice colour of its own — `markFace` in page.jsx carries the rest across.
 */
function seatColor(seat, faces) {
  return chairColor(seat?.characterId ?? HEAD_OF_TABLE, faces);
}

function chairColor(at, faces) {
  const face = faces.find((one) => one.characterId === at);

  return face?.diceColor ? diceColorHex(face.diceColor) : "var(--color-gold)";
}

/** A cell off the wire, believed only as far as its shape. */
function cell(value) {
  return Boolean(
    value && Number.isInteger(value.q) && Number.isInteger(value.r),
  );
}

function fraction(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

/** A point on the picture, whether or not it also names a cell. */
function spot(value) {
  return Boolean(value && fraction(value.x) && fraction(value.y));
}

/** Enough off the wire to draw an end of an arrow from. */
function aimed(value) {
  return cell(value) || spot(value);
}

/** The pair as this chair sends them: the point always, the cell where there is one. */
function named(at) {
  return {
    x: at.x,
    y: at.y,
    q: Number.isInteger(at.q) ? at.q : null,
    r: Number.isInteger(at.r) ? at.r : null,
  };
}

/** And back again, on the board that received them. */
function anchorOf(named, ruled, size, natural) {
  if (ruled && cell(named)) {
    return pointOfCell(named, size, natural);
  }

  return spot(named) ? named : null;
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
