"use client";

/**
 * One half of a stepper. Written for the health band that used to run across the
 * foot of the board; the band is gone and its bars are inside the party cards
 * now, and play/card-health.jsx still presses these two.
 *
 * The stepper they were named for is gone with it: the pack and the purse ask
 * "how many" with a field, which is what an amount somebody has just named
 * wants.
 */
/**
 * What the hover says. `danger` is the red the Retire button on a character card
 * wears, and it is here for the same reason: a warning at the moment it is one.
 *
 * Literal strings — a class built from a template is one the scanner never sees.
 */
const TONES = {
  gold: "hover:border-gold/45 hover:text-gold",
  danger: "hover:border-red-500 hover:text-red-500",
};

export function StepButton({
  onClick,
  disabled,
  label,
  wide = false,
  pill = false,
  tone = "gold",
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      /* `wide` carries a word rather than a sign, so it takes its width from
         the text; `pill` rounds it all the way, for the purse's Take and Grant,
         which stand among capsules and would be the only square thing there.
         Every half is written out for the scanner's sake. */
      className={
        `grid shrink-0 cursor-pointer place-items-center border ` +
        `${pill ? "rounded-full" : "rounded-lg"} ` +
        `border-gold/20 bg-surface/30 leading-none text-ink/70 ` +
        `transition-colors duration-300 ` +
        `${TONES[tone] ?? TONES.gold} ` +
        `disabled:cursor-not-allowed disabled:opacity-40 ` +
        (wide
          ? "h-9 px-3 font-display text-xs font-semibold tracking-wide"
          : "size-9 text-lg")
      }
    >
      {children}
    </button>
  );
}
