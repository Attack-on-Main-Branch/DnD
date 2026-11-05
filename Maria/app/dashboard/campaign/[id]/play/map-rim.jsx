"use client";

import { surfaceClasses } from "@/app/components/ui/surface";

import { FRAME_CLASSES, FRAME_DELAY } from "./entrance";
import { useCombatState } from "./table-state";

export default function MapRim({ compact = false }) {
  const { inCombat } = useCombatState();
  return (
    <span
      aria-hidden="true"
      className={surfaceClasses({
        className: `pointer-events-none absolute transition-[border-color,box-shadow] duration-300 ${
          compact
            ? "-inset-1.5 rounded-[1.125rem]"
            : `-inset-6 rounded-[2.25rem] max-sm:-inset-3 max-sm:rounded-3xl ${FRAME_CLASSES}`
        } ${
          inCombat
            ? "border-2 border-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.8),inset_0_0_15px_rgba(225,29,72,0.3)]"
            : ""
        }`,
      })}
      style={compact ? undefined : FRAME_DELAY}
    />
  );
}
