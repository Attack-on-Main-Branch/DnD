/**
 * Central surface styling, the counterpart to button.jsx.
 *
 * `.glass` and `.glow-gold` themselves live in globals.css, because both need
 * media-query overrides (reduced contrast, forced colours) that a utility
 * stack cannot carry. This module is where the app decides *which* surfaces
 * earn real glass — a decision with a measured cost attached.
 *
 * backdrop-filter is charged per element rather than per pixel: Chromium reads
 * back the destination render surface once for each filtered element, so cost
 * grows with how MANY there are, not how big. Measured against this app's
 * animated background, one surface costs about +60ms of compositor time per
 * 2.5 seconds and twenty-four cost +365ms, while a single surface grown from a
 * quarter of the viewport to the whole of it costs nothing measurable.
 *
 * Hence the split below. Anything at or under roughly 48px in its smaller
 * dimension gets `plain` instead: a blur radius of 14px has a kernel wider
 * than the element, so every output pixel averages the same neighbourhood and
 * the result degenerates to a flat tint. A solid fill is indistinguishable and
 * free.
 *
 * There is also a correctness reason, not only a cost one: an element with
 * backdrop-filter is itself a backdrop root, so glass nested inside glass has
 * nothing behind it to sample and renders as a flat colour. Cards are glass;
 * what sits inside them is not.
 */

const SURFACES = {
  /** Large page-level panels: the header, cards, the creation sheet. */
  glass: "glass",

  /** Overlays that sit on top of other content and must stay readable. */
  solid: "glass-solid",

  /**
   * Small controls, badges and pills. Same palette, no filter — visually
   * identical at this size, and it keeps the element budget for the surfaces
   * where the blur is actually visible.
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
 * The hairline under the header and the changelog panel's title: one pixel of
 * gold fading out at both ends, so it reads as a rule drawn across the page
 * rather than a box edge.
 *
 * A plain three-colour fade. It briefly had hard stops holding the outer 12%
 * transparent, on the theory that the header's rule ran wall to wall — but the
 * line that did that was the glass bar's own bottom border sitting directly
 * above this one, not this. Removing that border was the fix; shortening this
 * only made the changelog panel's rule too short.
 */
export const FADED_RULE_CLASSES =
  "h-px w-full bg-linear-to-r from-transparent via-gold/60 to-transparent";

/**
 * A choosable card sitting inside a glass panel — the archetype, path,
 * alignment and role tiles on the creation sheet.
 *
 * These deliberately carry no `backdrop-filter`, and it is not a cost
 * decision. The panel around them already has one, which makes it a backdrop
 * root: a nested filter can only sample what the panel itself has painted so
 * far, which is its own flat fill. Blurring a uniform colour returns that same
 * uniform colour, so a nested glass card renders as a flat tint with no
 * parallax and none of the animation showing through — while still costing a
 * full compositor readback each, thirty-odd times over on this one sheet.
 *
 * So the glass is imitated instead, out of the cues that actually read at this
 * size: a translucent dark fill deep enough to separate the card from the
 * panel, a gold rim, and a hairline of light along the top edge. `surface`
 * rather than `black`, so the card deepens the panel's own warm near-black
 * instead of introducing a second, cooler one.
 *
 * Exported as class strings rather than a `.nested-card` in globals.css on
 * purpose: components sit in an earlier cascade layer than utilities, so a
 * component class would lose to any `hover:bg-*` at the call site. That is the
 * same trap the card artwork's glow fell into.
 */
export const NESTED_CARD_CLASSES =
  "border-gold/15 bg-surface/60 shadow-[inset_0_1px_0_rgba(255,223,156,0.07)] " +
  "hover:border-gold/45 hover:bg-surface/50 " +
  "hover:shadow-[inset_0_1px_0_rgba(255,223,156,0.14)]";

/**
 * The chosen one, for the cards that have no accent colour of their own.
 *
 * Darker than the resting state rather than lighter, with the gold moved into
 * the rim, an inset hairline and a bloom — so selection reads as a lit dark
 * tile, matching the archetype and path cards, rather than as the one pale
 * tile in the grid.
 */
export const NESTED_CARD_SELECTED_CLASSES =
  "border-gold/55 bg-surface/75 " +
  "shadow-[inset_0_0_0_1px_rgba(255,223,156,0.16),0_18px_44px_-32px_rgba(255,223,156,0.55)]";
