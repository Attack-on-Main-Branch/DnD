"use client";

import { useEffect } from "react";

import { setBattleTint } from "@/app/components/paths-background/tint-control";

import { useCombatState } from "./table-state";

/**
 * The room going red while the party fights, on every chair — off the same
 * flag the board's rim reads, so the two can never disagree. Renders nothing.
 * Leaving the table takes the red with it.
 */
export default function CombatBackdrop() {
  const { inCombat } = useCombatState();

  useEffect(() => {
    setBattleTint(inCombat);

    return () => setBattleTint(false);
  }, [inCombat]);

  return null;
}
