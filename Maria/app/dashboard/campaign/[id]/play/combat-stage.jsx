"use client";

import CombatMark from "@/app/components/ui/combat-mark";

import { useCombatDrawer } from "./combat-drawer";
import { useCombatState } from "./table-state";

/**
 * The mark that calls for initiative, at the top of the head of the table's
 * rail. `RailTray`'s own button, class for class, but what it opens stands in
 * the log's column rather than over the board — see combat-drawer.jsx.
 *
 * Lit from the store and not from the drawer alone: a Dungeon Master who closed
 * the tracker still has to see, without opening anything, that a fight is on.
 */
export default function CombatStage() {
  const { open, toggle } = useCombatDrawer();
  const { inCombat } = useCombatState();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={
        inCombat
          ? "Initiative, a fight is running"
          : "Initiative and combat turns"
      }
      className={`grid size-15 cursor-pointer place-items-center rounded-full transition-colors duration-300 focus-visible:text-gold ${
        inCombat
          ? "text-rose-400 hover:text-rose-300"
          : open
            ? "text-gold"
            : "text-ink/60 hover:text-gold"
      }`}
    >
      <CombatMark
        className={`size-11 ${inCombat ? "motion-safe:animate-pulse" : ""}`}
      />
    </button>
  );
}
