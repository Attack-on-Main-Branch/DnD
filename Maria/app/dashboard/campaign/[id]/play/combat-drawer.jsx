"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useCombatSync } from "./use-combat";

/**
 * Whether the initiative tracker is open, and — for every chair — keeping what
 * the table is fighting current.
 *
 * ITS OWN PROVIDER BECAUSE THE TWO HALVES ARE IN DIFFERENT COLUMNS: the mark
 * that opens it is on the rail beside the board, the panel it opens is in the
 * log's column on the far side of the map.
 *
 * `useCombatSync` is called HERE, outside the branch that gates the mark on the
 * Dungeon Master: a player has no tracker in their tree, and without this their
 * board would never hear the turn pass.
 */

const RESTING = { open: false, toggle: () => {} };

const DrawerContext = createContext(RESTING);

export function useCombatDrawer() {
  return useContext(DrawerContext);
}

export default function CombatDrawer({ campaignId, children }) {
  const [open, setOpen] = useState(false);

  useCombatSync(campaignId);

  const toggle = useCallback(() => setOpen((standing) => !standing), []);

  const value = useMemo(() => ({ open, toggle }), [open, toggle]);

  return (
    <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  );
}
