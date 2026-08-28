"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  DEFAULT_RING_COLOR,
  nextRingColor,
  readPlacedToken,
} from "sina/rules/tokens";

import { toggleCondition } from "@/app/actions/characters";
import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";

import {
  markMapPiece,
  moveMapPiece,
  placeMapPiece,
  removeMapPiece,
  sweepMapPieces,
} from "./actions";
import {
  useAllConditions,
  useAllDead,
  usePlacedTokens,
  useTableStore,
  useTokenTemplates,
} from "./table-state";
import { useTableDeed } from "./use-table-deed";
import { useWireMessage } from "./table-wire";

/**
 * The pieces on the board: whose they are, who may lift them, and the writes
 * that move them.
 *
 * WHAT A MAP DECIDES, and the whole of it:
 *
 *   world map      the party's marker alone, from the head of the table. Six
 *                  faces standing on a continent is a lie about where anybody
 *                  is, so the individual tokens are not offered at all.
 *   any other map  the faces and the invented pieces, and never the party's
 *                  marker — the party IS the faces here. A player moves their
 *                  own; the head of the table moves everything.
 *
 * `place_map_token` asks the same question independently, so this is the door
 * rather than the lock.
 *
 * KEYED ON THE ROW, where the marks were keyed on the seat. A map carries as
 * many copies of one invented piece as the encounter needs, and nothing shorter
 * than the row's own id tells them apart. That is also why a placement paints
 * under a name of its own until the database hands back the real one — see
 * `place` below.
 *
 * The wire puts a piece down at once. The Postgres subscription under it is the
 * backstop for a socket that dropped, and it re-reads the board alone.
 *
 * HIDING IS NOT DONE HERE. A hidden piece is withheld by the SELECT policy, so
 * a player's re-read simply does not contain it; there is no version of it in
 * their browser to be revealed. 20260923090000 briefly opened that up and
 * 20260924090000 shut it again — a faint disc is still a disc, and a party that
 * can see where the unseen thing stands is not surprised by it.
 */
export function useMapTokens({
  campaignId,
  mapId,
  isWorldMap,
  ruled,
  faces,
  seat,
  canSweep,
}) {
  const placed = usePlacedTokens();
  const templates = useTokenTemplates();

  /* The party's own state, which a character's token wears rather than keeping
     a copy of — see `tokens` below. */
  const dead = useAllDead();
  const suffering = useAllConditions();

  const store = useTableStore();
  const { run, resync, send } = useTableDeed(campaignId);

  /** Ephemeral names for pieces the database has not yet named. */
  const drawn = useRef(0);

  /* Nothing off the wire is believed beyond its shape: every message goes
     through the same `readPlacedToken` that bounds a row on its way out of the
     database, and the ids it carries only ever pick out a face or a piece this
     board already has from the server. */
  useWireMessage("token", (message) => {
    const token = readPlacedToken(message.token);

    if (!token || !known(token, faces, templates)) {
      return;
    }

    store.setToken(token.id, token);
  });

  useWireMessage("token-gone", (message) => {
    if (typeof message.tokenId === "string") {
      store.setToken(message.tokenId, null);
    }
  });

  /* Doorbells, not payloads: a row off the socket has not been through a
     `select()` list, so the answer is to go and ask. Per MAP rather than per
     campaign — the table only ever looks at one, and the filter is a column. */
  useLiveRefresh({
    channel: `tokens:${mapId ?? "none"}`,
    table: "map_placed_tokens",
    filter: `map_id=eq.${mapId ?? ""}`,
    onChange: useCallback(() => resync({ tokens: true }), [resync]),
  });

  /* A map put on the table is a board this chair may have been away from. The
     store holds every map's pieces so switching is a filter rather than a round
     trip, and this is what keeps that from being a stale one. */
  useEffect(() => {
    if (mapId) {
      resync({ tokens: true });
    }
  }, [mapId, resync]);

  /**
   * RULING A BOARD SWEEPS IT. The pieces standing on it were put down at points
   * the new grid knows nothing about, and scattering them across the nearest
   * cells would be the app guessing at positions the Dungeon Master is about to
   * set deliberately. So the board is cleared and the pieces are dealt again,
   * onto the hexes they belong on.
   *
   * Every chair paints it, because every chair hears the grid go up — see the
   * `grid` message in table-maps.jsx. Only the head of the table writes it.
   */
  const wasRuled = useRef(null);

  useEffect(() => {
    const before = wasRuled.current;

    wasRuled.current = { mapId, ruled };

    // A different picture is not a transition: this watches ONE map's grid.
    if (!mapId || before?.mapId !== mapId || before.ruled || !ruled) {
      return;
    }

    store.sweepTokens(mapId);

    if (canSweep) {
      sweepMapPieces(mapId).catch(() => {});
    }
  }, [canSweep, mapId, ruled, store]);

  /**
   * A piece put down. `piece` is what the hand is holding: the party's marker,
   * a character's face, or one of the invented pieces.
   *
   * PAINTED UNDER A NAME OF ITS OWN, because the row's id is the database's to
   * make and the board draws before the call is even sent. `settleToken` swaps
   * the two in one write, so the piece is never on the board twice.
   *
   * THE RIM IS DECIDED HERE AND NOT IN THE PALETTE, which only shows what is
   * coming. Picking a piece up and putting it down are two separate events, and
   * a colour chosen at the press is a colour worked out from a board that has
   * since moved — which is how two goblins ended up wearing the same red. It is
   * read out of the store SYNCHRONOUSLY rather than off this render's copy, so
   * that holds for two placements inside one frame as well.
   */
  const place = useCallback(
    (point, piece) => {
      if (
        !point ||
        !mapId ||
        !mayPlace(piece, { isWorldMap, canSweep, seat })
      ) {
        return;
      }

      const pending = `pending:${++drawn.current}`;
      const templateId = piece.kind === "template" ? piece.templateId : null;
      const laid = {
        id: pending,
        mapId,
        characterId: piece.kind === "character" ? piece.characterId : null,
        templateId,
        isPartyMarker: piece.kind === "party",
        x: point.x,
        y: point.y,
        q: point.q ?? null,
        r: point.r ?? null,
        ringColor: templateId
          ? ringWorn(store.read().tokens, mapId, templateId)
          : DEFAULT_RING_COLOR,
        isHidden: false,
        isDead: false,
        conditions: [],
      };

      run({
        // Under the pointer before the write is even sent.
        paint: () => store.setToken(pending, laid),

        work: () =>
          placeMapPiece(mapId, {
            characterId: laid.characterId,
            templateId: laid.templateId,
            isPartyMarker: laid.isPartyMarker,
            point,
            ringColor: laid.ringColor,
          }),

        /* Only once it is written: a piece told to the table before the
           database has taken it is one that might yet be refused. */
        tell: (result) => {
          const settled = { ...laid, id: result.id };

          store.settleToken(pending, settled);
          send({ kind: "token", token: settled });
        },

        want: { tokens: true },
      }).then((result) => {
        // A refusal already resynced; this clears the drawing that stood in for
        // a row that was never written.
        if (!result) {
          store.setToken(pending, null);
        }
      });
    },
    [canSweep, isWorldMap, mapId, run, seat, send, store],
  );

  /** One already down, moved. The id names the row, so there is nothing to
      settle and nothing to guess. */
  const move = useCallback(
    (tokenId, point) => {
      const standing = placed.get(tokenId);

      if (!standing || !point) {
        return;
      }

      const moved = {
        ...standing,
        x: point.x,
        y: point.y,
        q: point.q ?? null,
        r: point.r ?? null,
      };

      run({
        paint: () => store.setToken(tokenId, moved),
        work: () => moveMapPiece(tokenId, point),
        tell: () => send({ kind: "token", token: moved }),
        want: { tokens: true },
      });
    },
    [placed, run, send, store],
  );

  /** One off the board, which is the menu's `Remove from map` and nothing
      else — a press on a piece no longer takes it off. */
  const lift = useCallback(
    (tokenId) => {
      run({
        paint: () => store.setToken(tokenId, null),
        work: () => removeMapPiece(tokenId),
        tell: () => send({ kind: "token-gone", tokenId }),
        want: { tokens: true },
      });
    },
    [run, send, store],
  );

  /**
   * And a condition put on a character, which is conditions-grid.jsx's deed
   * again. ONE PRESS IS ONE TOGGLE and which way it goes is the ROW's to
   * decide, not this board's: two chairs calling out "prone" in the same breath
   * would otherwise both read the same before-state and the second would take
   * it straight back off.
   */
  const afflict = useCallback(
    (characterId, key, held) => {
      const applied = !held.includes(key);

      run({
        paint: () =>
          store.setConditions(
            characterId,
            applied ? [...held, key] : held.filter((one) => one !== key),
          ),

        work: () => toggleCondition(characterId, key, campaignId, null),

        tell: (result) => {
          const standing = store.read().conditions[characterId] ?? [];

          store.setConditions(
            characterId,
            result.conditions ??
              (result.applied
                ? [...standing, key]
                : standing.filter((one) => one !== key)),
          );

          send({
            kind: "conditions",
            byCharacter: {
              [characterId]: store.read().conditions[characterId],
            },
          });
        },

        /* No activity: a condition leaves no line — see 20260915090000. */
        want: { party: true },
      });
    },
    [campaignId, run, send, store],
  );

  /**
   * Hidden, killed, or what it is suffering. The head of the table's alone —
   * `set_map_token_state` and `kill_character` each decide that again.
   *
   * WHERE THE WRITE LANDS DEPENDS ON WHOSE PIECE IT IS, and that is the whole of
   * this function:
   *
   *   hidden       always the map row. Nothing but a piece on a board can be
   *                out of sight, so there is no other column for it.
   *   a condition  a character's is their CARD's. Poisoned is something a
   *                CHARACTER is, and it belongs on their row whichever picture
   *                you reached for.
   *   dead         never a character's, and the menu does not offer it for one —
   *                their card carries hit points, three death saves and the
   *                revival, and a second door onto that only asked which one was
   *                real. The piece READS the card's flag; it does not set it.
   *
   * An invented piece and the party's marker have no card, so both land on the
   * map row where the columns are theirs alone.
   *
   * `patch` is one of `{ isHidden }`, `{ isDead }` or `{ condition: key }` — a
   * single toggle rather than a whole list, because that is what
   * `toggle_character_condition` takes and what the menu presses.
   */
  const mark = useCallback(
    (token, patch) => {
      const standing = placed.get(token.id);

      if (!standing) {
        return;
      }

      if (token.characterId && patch.condition) {
        afflict(token.characterId, patch.condition, token.conditions);
        return;
      }

      /* The map row's own columns. A condition arrives as one key and is
         folded into the list the row already carries. */
      const written = patch.condition
        ? {
            conditions: standing.conditions.includes(patch.condition)
              ? standing.conditions.filter((one) => one !== patch.condition)
              : [...standing.conditions, patch.condition],
          }
        : patch;

      const next = { ...standing, ...written };

      run({
        paint: () => store.setToken(token.id, next),
        work: () => markMapPiece(token.id, written),

        /* HIDING IS TOLD AS A REMOVAL, and revealing as a placement: the piece
           has genuinely left every player's board, so that is both the honest
           message and the one that paints correctly. */
        tell: () =>
          next.isHidden
            ? send({ kind: "token-gone", tokenId: token.id })
            : send({ kind: "token", token: next }),

        want: { tokens: true },
      });
    },
    [afflict, placed, run, send, store],
  );

  /**
   * What is standing on THIS map, with a face on each. The store holds every
   * map's, so this is where one board is picked out of them — and where the
   * map's own rule is applied a second time, to a row that was written before
   * the rule was, or by a request built by hand.
   */
  const tokens = useMemo(
    () =>
      piecesOnMap({
        placed,
        mapId,
        isWorldMap,
        faces,
        templates,
        dead,
        conditions: suffering,
      }).map((token) => {
        const mine = Boolean(seat) && token.characterId === seat.characterId;

        return {
          ...token,
          mine,
          movable: canSweep || mine,

          /* NOT BY CLICKING IT ANY MORE. A press that went nowhere used to lift
             a piece off, which meant every misjudged drag took a token off the
             board; it comes off through the menu now, on purpose. A player may
             still take their own back. */
          removable: canSweep || mine,

          /* Hide, kill and the conditions are the head of the table's — the
             menu draws only Remove for anybody else. */
          commandable: canSweep,
        };
      }),
    [
      canSweep,
      dead,
      faces,
      isWorldMap,
      mapId,
      placed,
      seat,
      suffering,
      templates,
    ],
  );

  /**
   * The piece a click on bare map puts down for this chair, or null where there
   * is none. On the world map that is the party's marker for the Dungeon
   * Master; anywhere else it is the viewer's own face.
   */
  const ownPiece = useMemo(() => {
    if (!seat) {
      return null;
    }

    if (isWorldMap) {
      return canSweep ? { kind: "party" } : null;
    }

    return seat.characterId
      ? { kind: "character", characterId: seat.characterId }
      : null;
  }, [canSweep, isWorldMap, seat]);

  return {
    tokens,

    /** This chair's own piece on this map, or null for one not yet down. */
    ownToken:
      tokens.find((token) =>
        ownPiece?.kind === "party"
          ? token.isPartyMarker
          : token.characterId === ownPiece?.characterId,
      ) ?? null,

    ownPiece,

    place: seat ? place : null,
    move: seat ? move : null,
    lift: seat ? lift : null,
    mark: canSweep ? mark : null,
  };
}

/**
 * Every piece on one map, wearing its face, its label, and — for a character's
 * token — the state off their CARD. Exported because the initiative tracker
 * draws the same list; two derivations would be two answers about who is dead.
 *
 * A character's face keeps nothing of its own: one character is one fact. The
 * map row's `is_dead` and `conditions` are for the pieces with no card.
 */
export function piecesOnMap({
  placed,
  mapId,
  isWorldMap,
  faces,
  templates,
  dead,
  conditions,
}) {
  return drawnOn(placed, mapId, isWorldMap, faces, templates).map((token) =>
    token.characterId
      ? {
          ...token,
          isDead: Boolean(dead?.[token.characterId]),
          conditions: conditions?.[token.characterId] ?? [],
        }
      : token,
  );
}

/**
 * The rim the next copy of one invented piece wears: the first colour nobody on
 * this board is already wearing. Exported to the palette as well, which shows it
 * before the piece is dealt — see nextRingColor for why it fills a gap rather
 * than counting.
 */
export function ringWorn(placed, mapId, templateId) {
  const worn = [];

  for (const token of placed.values()) {
    if (token.mapId === mapId && token.templateId === templateId) {
      worn.push(token.ringColor);
    }
  }

  return nextRingColor(worn);
}

/**
 * Whether this hand may put this piece on this map. The browser's copy of the
 * rule at the head of this file; the database asks it again, and that is the
 * run that counts.
 */
function mayPlace(piece, { isWorldMap, canSweep, seat }) {
  if (!piece || !seat) {
    return false;
  }

  if (isWorldMap) {
    return piece.kind === "party" && canSweep;
  }

  if (piece.kind === "party") {
    return false;
  }

  if (piece.kind === "template") {
    return canSweep;
  }

  return canSweep || piece.characterId === seat.characterId;
}

/** Whether this board has a face for the piece a message just named. */
function known(token, faces, templates) {
  if (token.characterId) {
    return faces.some((face) => face.characterId === token.characterId);
  }

  if (token.templateId) {
    return templates.some((one) => one.id === token.templateId);
  }

  return token.isPartyMarker;
}

/**
 * Every piece on one map that has something to wear.
 *
 * A token belonging to somebody who has left the party draws nothing — the
 * cascade takes those rows, and this covers the moment before that reaches this
 * browser. The map's own rule is applied here too, so a party marker that
 * somehow reached a battle map is not drawn on one.
 */
function drawnOn(placed, mapId, isWorldMap, faces, templates) {
  const shown = [];

  for (const token of placed.values()) {
    if (token.mapId !== mapId) {
      continue;
    }

    if (token.isPartyMarker) {
      if (isWorldMap) {
        shown.push({ ...token, label: "Party" });
      }

      continue;
    }

    // The world map carries the party and nothing else.
    if (isWorldMap) {
      continue;
    }

    if (token.characterId) {
      const face = faces.find((one) => one.characterId === token.characterId);

      if (face) {
        shown.push({
          ...token,
          label: face.label,
          src: face.src,
          colorClass: face.colorClass,
        });
      }

      continue;
    }

    const piece = templates.find((one) => one.id === token.templateId);

    if (piece) {
      shown.push({ ...token, label: piece.name, src: piece.image_url });
    }
  }

  return shown;
}
