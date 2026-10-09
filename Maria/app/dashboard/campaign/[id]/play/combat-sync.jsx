"use client";

import { useCombatSync } from "./use-combat";

/**
 * Keeps what the table is fighting current, on every chair. Its own component
 * independently of the tracker, so closing a panel never stops the board
 * from hearing the turn pass. Renders nothing.
 */
export default function CombatSync({ campaignId }) {
  useCombatSync(campaignId);

  return null;
}
