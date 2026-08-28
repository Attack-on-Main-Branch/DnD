"use client";

import { useCallback, useMemo } from "react";
import { initiativeOrder, MIN_COMBAT_ROUND } from "sina/rules/combat";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";

import {
  beginCombat,
  concludeCombat,
  nextCombatTurn,
  writeInitiative,
} from "./combat-actions";
import { useTableMaps } from "./table-maps";
import {
  useAllConditions,
  useAllDead,
  useCombatState,
  usePlacedTokens,
  useTableStore,
  useTokenTemplates,
} from "./table-state";
import { useTableDeed } from "./use-table-deed";
import { piecesOnMap } from "./use-map-tokens";
import { useWireMessage } from "./table-wire";

/**
 * What keeps the fight current, on EVERY chair. Mounted once for the whole table
 * — see combat-drawer.jsx — because a player has no tracker in their tree and
 * would otherwise never hear the turn pass.
 *
 * The wire is the fast half and Postgres the honest one. Neither payload is
 * trusted further than its shape: `setCombat` puts both through `readCombat`.
 */
export function useCombatSync(campaignId) {
  const store = useTableStore();
  const { resync } = useTableDeed(campaignId);

  useWireMessage(
    "combat",
    useCallback((message) => store.setCombat(message.combat), [store]),
  );

  /* Its own channel and not the shelf's: a socket may not join a topic twice. */
  useLiveRefresh({
    channel: `combat:${campaignId}`,
    table: "campaigns",
    filter: `id=eq.${campaignId}`,
    onChange: useCallback(() => resync({ combat: true }), [resync]),
  });
}

/**
 * The fight, as the tracker reads and writes it.
 *
 * THE ORDER IS DERIVED AND NEVER STORED. `initiativeOrder` is the one sort and
 * `combat_turn_order` is the same sort in SQL; the two must agree tie for tie,
 * or the glow walks a different ladder than the database is stepping down.
 *
 * Which is why the cursor is PREDICTED rather than awaited: each deed paints the
 * answer it knows is coming, and the `campaigns` doorbell is the honest half.
 *
 * The pieces come from `piecesOnMap`, the same derivation the board draws from —
 * a second one would be a second answer about who is dead.
 */
export function useCombat(campaignId, faces = []) {
  const combat = useCombatState();
  const placed = usePlacedTokens();
  const templates = useTokenTemplates();
  const dead = useAllDead();
  const suffering = useAllConditions();

  const { activeId, isWorldMap } = useTableMaps();
  const store = useTableStore();
  const { run, resync, send } = useTableDeed(campaignId);

  /**
   * Every piece that could take a turn, in the order the ladder draws them: the
   * ones that have rolled, highest first, then the ones that have not, in the
   * order they were put down. Sorting an empty box among the numbers would mean
   * deciding it is worth less than the lowest, which is not what it means.
   */
  const pieces = useMemo(() => {
    const standing = piecesOnMap({
      placed,
      mapId: activeId,
      isWorldMap,
      faces,
      templates,
      dead,
      conditions: suffering,
    }).filter((token) => !token.isDead);

    const rolled = initiativeOrder(standing);
    const seated = new Set(rolled.map((token) => token.id));

    const waiting = standing
      .filter((token) => !seated.has(token.id))
      .sort(
        (a, b) =>
          String(a.placedAt ?? "").localeCompare(String(b.placedAt ?? "")) ||
          String(a.id).localeCompare(String(b.id)),
      );

    return [...rolled, ...waiting];
  }, [activeId, dead, faces, isWorldMap, placed, suffering, templates]);

  /** The ladder the turn actually walks: the rolled ones, in order. */
  const order = useMemo(
    () => pieces.filter((token) => Number.isInteger(token.initiative)),
    [pieces],
  );

  const begin = useCallback(() => {
    const next = {
      inCombat: true,
      round: MIN_COMBAT_ROUND,
      activeTokenId: order[0]?.id ?? null,
    };

    run({
      paint: () => store.setCombat(next),
      work: () => beginCombat(campaignId),
      tell: () => {
        send({ kind: "combat", combat: next });
        // The line the database wrote; the other chairs answer by re-reading.
        send({ kind: "log" });
      },
      want: { combat: true, tokens: true },
    });
  }, [campaignId, order, run, send, store]);

  /** Over, and the numbers go with it — on every one of this campaign's maps.
      Painted locally to match, or the ladder sits full of numbers the database
      has already thrown away. */
  const conclude = useCallback(() => {
    const next = {
      inCombat: false,
      round: MIN_COMBAT_ROUND,
      activeTokenId: null,
    };

    run({
      paint: () => {
        store.setCombat(next);

        for (const token of placed.values()) {
          if (Number.isInteger(token.initiative)) {
            store.setToken(token.id, { ...token, initiative: null });
          }
        }
      },
      work: () => concludeCombat(campaignId),
      tell: () => {
        send({ kind: "combat", combat: next });
        send({ kind: "log" });
      },
      want: { combat: true, tokens: true },
    }).then((result) => {
      if (result) {
        resync({ tokens: true });
      }
    });
  }, [campaignId, placed, resync, run, send, store]);

  /** `set_token_initiative` re-evaluates the cursor for the same two cases this
      does, and the two must agree or the turn jumps when a number is typed. */
  const setInitiative = useCallback(
    (tokenId, initiative) => {
      const standing = placed.get(tokenId);

      if (!standing || standing.initiative === initiative) {
        return;
      }

      const written = { ...standing, initiative };

      run({
        paint: () => {
          store.setToken(tokenId, written);

          if (!combat.inCombat) {
            return;
          }

          const after = initiativeOrder(
            order
              .filter((one) => one.id !== tokenId)
              .concat(Number.isInteger(initiative) ? [written] : []),
          );

          const held =
            combat.activeTokenId &&
            after.some((one) => one.id === combat.activeTokenId);

          if (!held) {
            store.setCombat({
              ...combat,
              activeTokenId: after[0]?.id ?? null,
            });
          }
        },
        work: () => writeInitiative(tokenId, initiative),
        tell: () => send({ kind: "token", token: written }),
        want: { combat: true, tokens: true },
      });
    },
    [combat, order, placed, run, send, store],
  );

  /** One step down the ladder; off the bottom is the top again, a round later. */
  const nextTurn = useCallback(() => {
    if (!combat.inCombat) {
      return;
    }

    const next = { ...combat, ...steppedTurn(combat, order) };

    run({
      paint: () => store.setCombat(next),
      work: () => nextCombatTurn(campaignId),
      tell: () => send({ kind: "combat", combat: next }),
      want: { combat: true },
    });
  }, [campaignId, combat, order, run, send, store]);

  return {
    ...combat,
    pieces,
    order,
    begin,
    conclude,
    setInitiative,
    nextTurn,
  };
}

/** `advance_combat_turn`'s arithmetic, in the browser's terms — including the
    case that is not a lap: a cursor on a piece the order no longer contains has
    lost its place, so it goes to the top and the round stands. */
function steppedTurn(combat, order) {
  if (order.length === 0) {
    return { activeTokenId: null, round: combat.round };
  }

  const at = order.findIndex((token) => token.id === combat.activeTokenId);

  if (at < 0) {
    return { activeTokenId: order[0].id, round: combat.round };
  }

  const wraps = at >= order.length - 1;

  return {
    activeTokenId: order[wraps ? 0 : at + 1].id,
    round: wraps ? combat.round + 1 : combat.round,
  };
}
