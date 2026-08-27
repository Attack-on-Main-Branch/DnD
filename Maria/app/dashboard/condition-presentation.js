import { CONDITION_KEYS } from "sina/rules/conditions";

/**
 * What each of the fifteen conditions looks like.
 *
 * MARIA'S AND NOT SINA'S, for a reason that is not taste: Tailwind scans the
 * package its stylesheet lives in, so `Sina/` is never read and a class named
 * there is a class that does not exist. Fifteen conditions were printing in
 * plain ink because of exactly that — the strings were right, the CSS was never
 * generated. Same seam character-presentation.js keeps for avatar colours.
 *
 * THE STRINGS ARE LITERAL AND MUST STAY SO. A class built from a template is
 * one the scanner never sees, which is the same failure in a new place.
 */
const DRESS = {
  blinded: {
    color: "text-slate-400",
    border: "border-slate-500",
    bg: "bg-slate-500/15",
    glow: "shadow-[0_0_8px_rgba(100,116,139,0.55)]",
  },
  charmed: {
    color: "text-pink-400",
    border: "border-pink-500",
    bg: "bg-pink-500/15",
    glow: "shadow-[0_0_8px_rgba(236,72,153,0.55)]",
  },
  deafened: {
    color: "text-sky-300",
    border: "border-sky-400",
    bg: "bg-sky-400/15",
    glow: "shadow-[0_0_8px_rgba(56,189,248,0.55)]",
  },
  frightened: {
    color: "text-purple-400",
    border: "border-purple-500",
    bg: "bg-purple-500/15",
    glow: "shadow-[0_0_8px_rgba(168,85,247,0.55)]",
  },
  grappled: {
    color: "text-orange-400",
    border: "border-orange-500",
    bg: "bg-orange-500/15",
    glow: "shadow-[0_0_8px_rgba(249,115,22,0.55)]",
  },
  incapacitated: {
    color: "text-rose-500",
    border: "border-rose-500",
    bg: "bg-rose-500/15",
    glow: "shadow-[0_0_8px_rgba(244,63,94,0.55)]",
  },
  invisible: {
    color: "text-cyan-300",
    border: "border-cyan-400",
    bg: "bg-cyan-400/15",
    glow: "shadow-[0_0_8px_rgba(34,211,238,0.55)]",
  },
  paralyzed: {
    color: "text-yellow-400",
    border: "border-yellow-400",
    bg: "bg-yellow-400/15",
    glow: "shadow-[0_0_8px_rgba(250,204,21,0.55)]",
  },
  petrified: {
    color: "text-stone-400",
    border: "border-stone-500",
    bg: "bg-stone-500/15",
    glow: "shadow-[0_0_8px_rgba(120,113,108,0.55)]",
  },
  poisoned: {
    color: "text-emerald-400",
    border: "border-emerald-500",
    bg: "bg-emerald-500/15",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.55)]",
  },
  prone: {
    color: "text-amber-500",
    border: "border-amber-600",
    bg: "bg-amber-500/15",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.55)]",
  },
  restrained: {
    color: "text-zinc-400",
    border: "border-zinc-500",
    bg: "bg-zinc-500/15",
    glow: "shadow-[0_0_8px_rgba(113,113,122,0.55)]",
  },
  stunned: {
    color: "text-amber-300",
    border: "border-amber-400",
    bg: "bg-amber-400/15",
    glow: "shadow-[0_0_8px_rgba(251,191,36,0.55)]",
  },
  unconscious: {
    color: "text-indigo-400",
    border: "border-indigo-500",
    bg: "bg-indigo-500/15",
    glow: "shadow-[0_0_8px_rgba(129,140,248,0.55)]",
  },
  exhaustion: {
    color: "text-red-500",
    border: "border-red-600",
    bg: "bg-red-500/15",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.55)]",
  },
};

const UNDRESSED = CONDITION_KEYS.filter((key) => !DRESS[key]);

if (UNDRESSED.length > 0) {
  throw new Error(
    `condition-presentation: no colours for ${UNDRESSED.join(", ")}. ` +
      `Sina lists it in rules/conditions.js — add it to DRESS here, or the ` +
      `grid prints a condition in the same ink as every other.`,
  );
}

const COLOURS = CONDITION_KEYS.map((key) => DRESS[key].color);

if (new Set(COLOURS).size !== COLOURS.length) {
  throw new Error(
    `condition-presentation: two conditions share a colour. The badges along ` +
      `a card are read by colour before they are read by name.`,
  );
}

/** No fallback: the checks above have already proved every key is dressed. */
export function conditionDress(key) {
  return DRESS[key];
}
