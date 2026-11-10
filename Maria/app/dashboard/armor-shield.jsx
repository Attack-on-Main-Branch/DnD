"use client";

import { useId } from "react";

export const ARMOR_VALUE_CLASSES =
  "absolute inset-x-1 top-[1.3125rem] z-10 h-4 text-center font-display text-[0.75rem] leading-none font-bold text-sky-200 tabular-nums";

// Matches the 36px ring and overlap in level-armor-frame.jsx.
const RING_CENTRE = 4;
const RING_RADIUS = 17.5;
const SHIELD_PATH =
  "M3.5 4 H32.5 V28 C32.5 35 24.5 38.5 18 42.5 C11.5 38.5 3.5 35 3.5 28 Z";

export default function ArmorShield({ children }) {
  const maskId = useId();

  return (
    <span className="relative block h-11 w-9">
      <svg
        aria-hidden="true"
        viewBox="0 0 36 44"
        className="absolute inset-0 h-full w-full"
      >
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect x="0" y="0" width="36" height="44" fill="#fff" />
          <circle cx="18" cy={RING_CENTRE} r={RING_RADIUS} fill="#000" />
        </mask>
        <path
          d={SHIELD_PATH}
          mask={`url(#${maskId})`}
          className="fill-sky-950/85 stroke-sky-400/75"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </span>
  );
}

export function ArmorValue({ value, name }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`grid place-items-center ${ARMOR_VALUE_CLASSES}`}
      >
        {value}
      </span>
      <span className="sr-only">{`${name} armour class ${value}`}</span>
    </>
  );
}
