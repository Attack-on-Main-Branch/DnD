/**
 * Central surface styling, the counterpart to button.jsx. `.glass` and
 * `.glow-gold` live in globals.css because both need media-query overrides a
 * utility stack cannot carry; this module decides which surfaces earn glass.
 *
 * backdrop-filter is charged per element, not per pixel: Chromium reads back
 * the destination render surface once per filtered element. Measured here, one
 * surface costs ~60ms of compositor time per 2.5s and twenty-four cost ~365ms,
 * while growing a single surface to fill the viewport costs nothing measurable.
 *
 * A filtered element is also itself a backdrop root, so glass nested inside
 * glass has nothing behind it to sample and flattens to a solid tint.
 */

const SURFACES = {
  /** Large page-level panels: the header, cards, the creation sheet. */
  glass: "glass",

  /** Overlays that sit on top of other content and must stay readable. */
  solid: "glass-solid",

  /**
   * Small controls, badges and pills. Under ~48px a 14px blur kernel is wider
   * than the element, so every pixel averages the same neighbourhood and the
   * result is a flat tint anyway — a solid fill is free and identical.
   */
  plain:
    "border border-gold/20 bg-surface/70 shadow-[inset_0_1px_0_rgba(255,223,156,0.08)]",
};

export function surfaceClasses({
  variant = "glass",
  glow = false,
  className = "",
} = {}) {
  return [
    SURFACES[variant] ?? SURFACES.glass,
    glow ? "glow-gold" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The geometry of a top-level glass panel. Not a default on `surfaceClasses` —
 * the card, drawer, header bar and empty slot all want their own.
 */
export const PANEL_CLASSES = "rounded-2xl p-6 sm:p-8";

/**
 * The darkening around a map, shared by the dashboard card and the campaign
 * page so the two cannot drift. Not used on the full-resolution view, where
 * darkened edges would hide the part you opened it to read.
 *
 * The sizing keywords are load-bearing. The default `farthest-corner` puts the
 * 100% stop in the corners, leaving the middle of each edge at ~71% — so the
 * darkest third of the ramp landed in four corners and nowhere else.
 * `closest-side` measures to half the short side instead, and the stops run
 * past 100% so the ramp reaches the long edges rather than flattening early.
 */
export const MAP_VIGNETTE_STYLE = {
  background:
    "radial-gradient(circle closest-side at center, transparent 30%, rgba(0,0,0,0.75) 130%, rgba(0,0,0,1) 190%)",
};

/** The hairline under the header and the changelog panel's title. */
export const FADED_RULE_CLASSES =
  "h-px w-full bg-linear-to-r from-transparent via-gold/60 to-transparent";

/**
 * A choosable card inside a glass panel — the archetype, path, alignment and
 * role tiles. No `backdrop-filter` by design: the panel around them is already
 * a backdrop root, so a nested filter samples only the panel's own flat fill
 * and returns it unchanged, while still costing a compositor readback each.
 * The glass is imitated instead, out of the cues that read at this size.
 *
 * Class strings rather than a `.nested-card` in globals.css: components sit in
 * an earlier cascade layer than utilities, so a component class would lose to
 * any `hover:bg-*` at the call site.
 */
export const NESTED_CARD_CLASSES =
  "border-gold/15 bg-surface/60 shadow-[inset_0_1px_0_rgba(255,223,156,0.07)] " +
  "hover:border-gold/45 hover:bg-surface/50 " +
  "hover:shadow-[inset_0_1px_0_rgba(255,223,156,0.14)] " +
  // The restatement button.jsx also carries: some of these cards are real
  // <button>s, so the shadow above overwrites the ring's achromatic casing.
  "focus-visible:shadow-[inset_0_1px_0_rgba(255,223,156,0.07),0_0_0_6px_rgba(10,8,6,0.9)] " +
  "hover:focus-visible:shadow-[inset_0_1px_0_rgba(255,223,156,0.14),0_0_0_6px_rgba(10,8,6,0.9)]";

/** The chosen one, for cards with no accent colour of their own. */
export const NESTED_CARD_SELECTED_CLASSES =
  "border-gold/55 bg-surface/75 " +
  "shadow-[inset_0_0_0_1px_rgba(255,223,156,0.16),0_18px_44px_-32px_rgba(255,223,156,0.55)]";
