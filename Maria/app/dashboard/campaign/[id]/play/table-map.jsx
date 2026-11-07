"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CONE_ANGLE,
  MAP_DRAWING_SHAPES,
  isDrawingCell,
  isDrawingPoint,
  readMapDrawing,
} from "sina/rules/map-drawing";
import { FEET_PER_HEX } from "sina/rules/grid";

import Button from "@/app/components/ui/button";
import { hexDistance, hexToPixel, pixelToHex } from "@/lib/hex-math";
import { mapDestination } from "@/lib/token-movement.mjs";

import { useMapZoom } from "../use-map-zoom";

import { holdTray } from "./dice-engine";
import DiceBoard from "./dice-board";
import MapRim from "./map-rim";
import MapDrawing, { DrawingDistance } from "./map-drawing";
import MapDrawingTools, { MapControlTray } from "./map-drawing-tools";
import MapTools from "./map-tools";
import FogOverlay from "./fog-overlay";
import FogBrushPreview from "./fog-brush-preview";
import HexGridOverlay from "./hex-grid-overlay";
import { HEAD_OF_TABLE } from "./dice-table";
import { useTableMaps } from "./table-maps";
import { useTableWire, useWireMessage } from "./table-wire";
import MapTokens, { TokenRoll } from "./map-tokens";
import SceneCamera from "./scene-camera";
import { useSceneStaging } from "./scene-staging";
import { diceColorHex } from "@/app/dashboard/character-presentation";
import { MAP_MAX_HEIGHT_CLASS } from "./map-height";
import { useMapTokens } from "./use-map-tokens";
import { useVisibleMapTokens } from "./use-token-visibility";

/**
 * The board, and the two hands over it.
 *
 * The wheel zooms. Left-drag pans bare map; a token takes the press for moving
 * or drawing. The right button measures from anywhere.
 *
 * The frame clips the zoom and shrink-wraps the picture, so the glass mat round
 * it stays the same rim at every size and the pieces lie over it on a plain
 * `inset-0`. The entrance rides on the frame rather than the image, which is
 * already carrying the pan and the scale.
 *
 * Drawings are ephemeral and shared through `announce`. Releasing a drawing
 * clears it without changing any pieces.
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
  cast = null,
  heightClass = MAP_MAX_HEIGHT_CLASS,
  className = "",
  style,
  phone = false,
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
    isScene,
    grid,
    gridSettled,
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
    isScene,
    settled: gridSettled,
    natural,
    faces,
    seat,
    canSweep,
  });

  const { send, display } = useTableWire();
  const visibleTokens = useVisibleMapTokens(
    tokens,
    mask,
    fog.enabled,
    canSweep,
  );
  const [shape, setShape] = useState(MAP_DRAWING_SHAPES[0]);
  const [angle, setAngle] = useState(DEFAULT_CONE_ANGLE);
  const canDraw = Boolean(
    activeId &&
    !isScene &&
    (canSweep || (seat?.characterId && (phone || ownToken))),
  );
  const canTapMove = shape === MAP_DRAWING_SHAPES[0];
  const [tapAim, setTapAim] = useState(null);
  const [moving, setMoving] = useState(false);
  const aim =
    canDraw &&
    tapAim &&
    tapAim.size === grid.size &&
    tapAim.ruled === grid.enabled &&
    (!tapAim.token ||
      (canTapMove &&
        tapAim.token.id === ownToken?.id &&
        tapAim.token.x === ownToken.x &&
        tapAim.token.y === ownToken.y))
      ? tapAim
      : null;

  const scene = useSceneStaging();
  const staged = Boolean(
    canSweep && scene.enabled && activeId && !isWorldMap && !isScene,
  );
  const camera = staged ? (scene.cameras.get(activeId) ?? null) : null;

  /** The selected shape and where its drag began. */
  const [measure, setMeasure] = useState(null);

  /* Everybody else's arrows, by seat. A ruled board names cells and an unruled
     one names points; `anchorOf` takes whichever it can use. */
  const [aims, setAims] = useState({});

  useEffect(() => setAims({}), [activeId]);

  useWireMessage(
    "aim",
    useCallback(
      (message) => {
        const at = typeof message.seat === "string" ? message.seat : null;

        if (
          !at ||
          message.mapId !== activeId ||
          (at !== HEAD_OF_TABLE &&
            !faces.some((face) => face.characterId === at))
        ) {
          return;
        }

        const drawing = readMapDrawing(message);
        setAims((standing) => {
          if (!drawing) {
            const { [at]: gone, ...rest } = standing;

            return gone === undefined ? standing : rest;
          }

          return { ...standing, [at]: { ...drawing, mapId: activeId } };
        });
      },
      [activeId, faces],
    ),
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

  const startPhoneAim = useCallback(
    (point, target) => {
      if (!point || !canDraw || moving) return null;
      const token =
        canTapMove &&
        ownToken &&
        target?.closest("[data-map-token]")?.dataset.mapToken === ownToken.id
          ? ownToken
          : null;
      const from = mapDestination(token ?? point, natural, grid);
      return (
        from && { from, to: null, token, size: grid.size, ruled: grid.enabled }
      );
    },
    [canDraw, canTapMove, grid, moving, natural, ownToken],
  );

  /**
   * A left click on bare map. A piece in the hand goes down there; otherwise a
   * chair with nothing on the board puts its own out. A chair that already has
   * one gets nothing — from then on it is moved by dragging, or every stray
   * click would teleport it.
   */
  const onTap = useCallback(
    (point, target) => {
      if (!point) {
        return false;
      }

      if (phone) {
        if (aim?.to && !aim.token) {
          setTapAim(null);
          return true;
        }
        const started = startPhoneAim(point, target);
        if (!started) return true;

        if (started.token && aim?.token) {
          setTapAim(null);
        } else if (aim) {
          setTapAim({ ...aim, to: started.from });
        } else {
          setTapAim(started);
        }
        return true;
      }

      if (staged && scene.armed) {
        scene.place(
          activeId,
          point,
          tokens.map((token) => ({ x: token.x, y: token.y })),
        );

        return true;
      }

      if (!place) {
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
    [
      activeId,
      aim,
      carrying,
      hold,
      holding,
      ownPiece,
      ownToken,
      place,
      phone,
      put,
      scene,
      snap,
      staged,
      startPhoneAim,
      tokens,
    ],
  );

  const latest = useRef(null);

  function onHold(point, target) {
    const started = startPhoneAim(point, target);
    if (!started) return null;
    const base = {
      ...(!started.token && aim && !aim.to ? aim : started),
      held: true,
    };
    setTapAim(base);

    function destination(point) {
      const to = mapDestination(point, natural, grid);
      if (!to || (to.x === base.from.x && to.y === base.from.y)) return null;
      return { ...base, to };
    }

    return {
      move: (point) => setTapAim(destination(point) ?? base),
      end: (point) => {
        const finished = destination(point);
        if (finished?.token) {
          latest.current?.confirmMove(finished);
        } else {
          setTapAim(finished && { ...finished, held: false });
        }
      },
      cancel: () => setTapAim(null),
    };
  }

  const { zoomed, frameProps, imageStyle, scale, pointAt } = useMapZoom({
    frameRef,
    imageRef,
    // Turn to zoom, about whatever is under the pointer.
    wheel: !display,
    // And not on a click: that press is a piece's.
    pointerZoom: false,
    /* NOT A KEYBOARD CONTROL. The board answered Space, Enter and the four
       arrows, which is a surprise on a surface whose whole job is where a
       pointer lands — and being a `role="button"` to do it hid every piece on
       it from a screen reader. The modal on the campaign sheet keeps both. */
    keyboard: false,
    pinch: phone,
    onTap,
    onHold: phone ? onHold : undefined,
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
    (from, to, shape = MAP_DRAWING_SHAPES[0], angle = DEFAULT_CONE_ANGLE) => {
      const ruled = isDrawingCell(from) && isDrawingCell(to);
      const next =
        !from || !to
          ? null
          : ruled
            ? `${activeId}:${shape}:${angle}:${from.q},${from.r}:${to.q},${to.r}`
            : `${activeId}:${shape}:${angle}:${from.x.toFixed(4)},${from.y.toFixed(4)}:${to.x.toFixed(4)},${to.y.toFixed(4)}`;

      if (told.current === next) {
        return;
      }

      const now = Date.now();

      if (!phone && next && !ruled && now - spoke.current < AIM_QUIET_MS) {
        return;
      }

      told.current = next;
      spoke.current = now;

      send({
        kind: "aim",
        mapId: activeId,
        seat: seat?.characterId ?? HEAD_OF_TABLE,
        shape,
        angle,
        from: from && named(from),
        to: to && named(to),
      });
    },
    [activeId, phone, seat, send],
  );

  const tapShape = aim?.token ? MAP_DRAWING_SHAPES[0] : shape;
  useEffect(() => {
    if (phone) announce(aim?.from, aim?.to, tapShape, angle);
  }, [aim, angle, announce, phone, tapShape]);

  async function confirmMove(candidate) {
    if (
      !candidate?.token ||
      !candidate.to ||
      !move ||
      moving ||
      !canTapMove ||
      candidate.size !== grid.size ||
      candidate.ruled !== grid.enabled ||
      candidate.token.id !== ownToken?.id ||
      candidate.token.x !== ownToken.x ||
      candidate.token.y !== ownToken.y
    )
      return;
    setMoving(true);
    setTapAim(null);
    try {
      await move(candidate.token.id, candidate.to);
    } finally {
      setMoving(false);
    }
  }

  /* Kept current without the effect below naming them: `pointAt` is rebuilt on
     every render, so it as a dependency would resubscribe on every move. */
  useEffect(() => {
    latest.current = {
      pointAt,
      snap,
      put,
      announce,
      paintFog,
      brush,
      fogSize,
      confirmMove,
    };
  });

  useEffect(() => {
    setTapAim(null);
    setMeasure(null);
    setLifted(null);
    setHover(null);

    return () => latest.current?.announce(null, null);
  }, [activeId, canDraw, shape, angle]);

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
      if (measure && event.pointerId !== measure.pointerId) {
        return;
      }
      const point = aimAt(event);

      /* A HIDDEN PIECE DRAGS IN SILENCE. Its row is withheld from every player,
         so an arrow tracking it across their board would be the one thing that
         gave it away. The head of the table still sees their own. */
      if (carrying?.token?.isHidden) {
        return;
      }

      const anchor = carrying ? carrying.from : measure.from;

      latest.current.announce(
        anchor && latest.current.snap(anchor),
        point,
        measure?.shape,
        measure?.angle,
      );
    }

    function release(event) {
      if (measure && event.pointerId !== measure.pointerId) {
        return;
      }
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

    function cancel() {
      setMeasure(null);
      setLifted(null);
      setHover(null);
      handled.current = false;
      latest.current.announce(null, null);
    }

    document.addEventListener("pointermove", follow);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);

    return () => {
      document.removeEventListener("pointermove", follow);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
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

    let frame = null;
    let pending = null;

    function flush() {
      frame = null;
      if (!pending) return;
      const at = latest.current;
      at.paintFog(strokeAt.current, pending, at.brush, at.fogSize);
      strokeAt.current = pending;
      pending = null;
    }

    function follow(event) {
      const at = latest.current;
      const point = at.pointAt(event);

      if (!point) {
        return;
      }

      pending = point;
      if (frame === null) frame = requestAnimationFrame(flush);
    }

    function release() {
      if (frame !== null) cancelAnimationFrame(frame);
      flush();
      strokeAt.current = null;
      setStroking(false);
    }

    document.addEventListener("pointermove", follow);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
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

      if (!phone) holdTray(size.width, size.height);
      setNatural(size);
      // The mask is held in the provider and wants this picture's ratio.
      reportNatural(size);
    }
  }, [phone, reportNatural, url]);

  useEffect(() => {
    if (phone && natural) holdTray(natural.width, natural.height);
  }, [phone, natural]);

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

    if (aim?.to) {
      drawn.push({
        key: "phone",
        from: aim.from,
        to: aim.to,
        color: seatColor(seat, faces),
        shape: tapShape,
        angle,
      });
    }

    // The ruler measures for whoever is holding it; a carried piece points from
    // where it stands. A stored point is already at a centre; `snap` names it.
    if (hover && (carrying?.from || measure)) {
      drawn.push({
        key: "mine",
        from: snap(measure ? measure.from : carrying.from),
        to: hover,
        color: seatColor(seat, faces),
        shape: measure?.shape ?? MAP_DRAWING_SHAPES[0],
        angle: measure?.angle ?? DEFAULT_CONE_ANGLE,
      });
    }

    // And everybody else's, from the cell they named on a ruled board or the
    // point they named on one without lines.
    for (const [at, beam] of Object.entries(aims)) {
      if (beam.mapId !== activeId) {
        continue;
      }
      const from = anchorOf(beam.from, grid.enabled, grid.size, natural);
      const to = anchorOf(beam.to, grid.enabled, grid.size, natural);

      if (from && to) {
        drawn.push({
          key: at,
          from,
          to,
          shape: beam.shape,
          angle: beam.angle,
          color: chairColor(at, faces),
        });
      }
    }

    return drawn;
  }, [
    aims,
    aim,
    angle,
    activeId,
    carrying,
    faces,
    grid.enabled,
    grid.size,
    hover,
    measure,
    natural,
    seat,
    snap,
    tapShape,
  ]);

  /** Right-button drawings suppress the browser's menu over the map. */
  function onContextMenu(event) {
    if ((grid.enabled || canDraw) && pointAt(event)) {
      event.preventDefault();
    }
  }

  const layerStyle = phone ? undefined : imageStyle;
  const ratio = natural && natural.width / natural.height;
  const traySize =
    (phone || display) && ratio
      ? {
          width: `min(100cqw, ${100 * ratio}cqh)`,
          aspectRatio: ratio,
        }
      : undefined;

  const mapLayers = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={url}
        alt={`Map of ${title}`}
        fetchPriority="high"
        // Without this the browser starts its own image drag on mousedown,
        // which cancels the pan before it begins.
        draggable={false}
        className={
          (phone || display) && natural
            ? "block size-full"
            : `block max-w-full ${heightClass}`
        }
        style={layerStyle}
        onLoad={(event) => {
          const size = {
            width: event.target.naturalWidth,
            height: event.target.naturalHeight,
          };

          if (!phone) holdTray(size.width, size.height);
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
          hover={aim ? (aim.to ?? aim.from) : hover}
          layerStyle={layerStyle}
        />
      )}

      {/* UNDER THE PIECES: an arrow across a crowded board runs behind the
            faces rather than over them. The figures go over — see below. */}
      {beams.map((beam) => (
        <MapDrawing
          key={beam.key}
          width={natural.width}
          height={natural.height}
          from={beam.from}
          to={beam.to}
          shape={beam.shape}
          angle={beam.angle}
          // The cell, ruled or not — the piece it points at is that size too.
          size={grid.size}
          color={beam.color}
          layerStyle={layerStyle}
        />
      ))}

      <MapTokens
        campaignId={campaignId}
        canSweep={canSweep}
        tokens={visibleTokens}
        scale={scale}
        layerStyle={layerStyle}
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
        drawing={canDraw && shape !== MAP_DRAWING_SHAPES[0]}
        selectedId={aim?.token?.id}
        /* Where the press began travels with it: a press that goes nowhere
             is not a drag, and now does nothing at all. */
        onGrab={
          !phone && place && (!canDraw || shape === MAP_DRAWING_SHAPES[0])
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
        onLift={!phone && lift ? (token) => lift(token.id) : null}
      />
      {/* Distances sit above the pieces, including those visible in fog. */}
      {beams.map((beam) => (
        <DrawingDistance
          key={beam.key}
          width={natural.width}
          height={natural.height}
          from={beam.from}
          to={beam.to}
          shape={beam.shape}
          size={grid.size}
          layerStyle={{ ...layerStyle, zIndex: 1 }}
        />
      ))}

      {/* Each chair's own token and the DM's pieces sit above this layer. */}
      <FogOverlay
        key={activeId}
        maskRef={mask.maskRef}
        subscribe={mask.subscribe}
        seeThrough={canSweep}
        enabled={fog.enabled}
        coverOnLoad={display}
        frameRatio={phone ? ratio : undefined}
        style={layerStyle}
      />
      <FogBrushPreview
        size={fogSize}
        scale={scale}
        canSweep={canSweep}
        brush={brush}
        frameRef={frameRef}
        pointAt={pointAt}
      />

      {/* Over the fog: the Dungeon Master sees through it anyway. */}
      {camera && (
        <SceneCamera
          camera={camera}
          natural={natural}
          scale={scale}
          layerStyle={layerStyle}
          pointAt={pointAt}
          onPaint={(patch) => scene.paintCamera(activeId, patch)}
          onCommit={(patch) => scene.commitCamera(activeId, patch)}
        />
      )}
    </>
  );

  const frame = (
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

        if (
          !phone &&
          event.isPrimary &&
          ((event.button === 2 && (grid.enabled || canDraw)) ||
            (event.button === 0 &&
              canDraw &&
              event.target.closest("[data-map-token]") &&
              !holding &&
              !(staged && scene.armed)))
        ) {
          const from = snap(pointAt(event));

          if (from) {
            event.preventDefault();
            setMeasure({
              from,
              shape: canDraw ? shape : MAP_DRAWING_SHAPES[0],
              angle,
              pointerId: event.pointerId,
            });

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
      style={display ? { ...style, ...traySize } : style}
      // `touch-none` so a drag on a touchscreen pans the map instead of
      // scrolling the page out from under it.
      /* NO MAGNIFIER. A click on the board does not zoom — the wheel does —
           so a cursor promising one was pointing at a control that is not
           there. Zoomed in it is a hand, because then it pans. */
      className={`group relative isolate touch-none overflow-hidden rounded-xl select-none ${
        (staged && scene.armed) || brush
          ? "cursor-crosshair"
          : zoomed
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default"
      } ${phone ? "size-full bg-surface [-webkit-touch-callout:none]" : "w-fit"} ${className}`}
    >
      {phone ? (
        <div
          className="absolute top-1/2 left-1/2 -translate-1/2"
          style={{ ...traySize, ...imageStyle }}
        >
          {mapLayers}
        </div>
      ) : (
        mapLayers
      )}
    </div>
  );

  return (
    <>
      {phone ? (
        <div className="col-start-1 row-start-1 min-h-0 w-full p-1.5 [container-type:size]">
          <div className="relative size-full">
            <MapRim compact />
            {frame}
            <div className="pointer-events-none absolute inset-0 z-10">
              <DiceBoard phone traySize={traySize} />
            </div>
          </div>
        </div>
      ) : (
        frame
      )}
      {phone ? (
        canDraw && (
          <div className="relative z-10 col-start-1 row-start-2 grid w-full justify-items-center gap-1">
            <MapDrawingTools
              phone
              shape={shape}
              angle={angle}
              onShape={setShape}
              onAngle={setAngle}
            />
            <div className="flex min-h-10 w-full flex-wrap items-center justify-center gap-x-2 rounded-xl border border-gold/20 bg-surface/90 px-1 text-center text-xs text-ink/80">
              <p role="status">
                {phoneMapHint(aim, moving, canTapMove && Boolean(ownToken))}
              </p>
              {aim && !aim.held && (
                <Button
                  variant="ghost"
                  className="max-sm:min-h-9 py-1 text-xs"
                  onClick={() => setTapAim(null)}
                >
                  Cancel
                </Button>
              )}
              {aim?.token && aim.to && !aim.held && (
                <Button
                  className="max-sm:min-h-9 px-3 py-1 text-xs"
                  onClick={() => confirmMove(aim)}
                  disabled={moving}
                >
                  {aim.ruled ? "Move to hex" : "Move here"}
                </Button>
              )}
            </div>
          </div>
        )
      ) : (
        <div
          data-map-controls
          className="pointer-events-none absolute inset-x-0 top-full z-10"
        >
          {(canSweep || seat?.characterId) && (
            <MapControlTray shown={canDraw}>
              {canSweep && <MapTools />}
              <MapDrawingTools
                shape={shape}
                angle={angle}
                onShape={setShape}
                onAngle={setAngle}
              />
            </MapControlTray>
          )}
          <div className="relative">{cast}</div>
        </div>
      )}
      <TokenRoll tokens={visibleTokens} />
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

function phoneMapHint(aim, moving, canMove) {
  if (moving) return "Moving…";
  if (!aim) {
    return canMove
      ? "Tap your token to move, or tap two points to measure."
      : "Tap two points to measure.";
  }
  if (!aim.to) {
    if (aim.held) return aim.token ? "Drag to move" : "Drag to measure";
    return aim.token ? "Tap a destination" : "Tap a second point";
  }
  if (!aim.ruled)
    return aim.token ? "Destination selected" : "Measurement drawn";
  return `${hexDistance(aim.from, aim.to) * FEET_PER_HEX} ft`;
}

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
  if (ruled && isDrawingCell(named)) {
    return pointOfCell(named, size, natural);
  }

  return isDrawingPoint(named) ? named : null;
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
