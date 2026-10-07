"use client";

import { useCombatSync } from "./use-combat";

/**
 * Keeps what the table is fighting current, on every chair. Its own component
 * and outside the branch that gates the tracker on the Dungeon Master: a
 * player has no tracker in their tree, and without this their board would
 * never hear the turn pass. Renders nothing.
 */
export default function CombatSync({ campaignId }) {
  useCombatSync(campaignId);

  return null;
}
