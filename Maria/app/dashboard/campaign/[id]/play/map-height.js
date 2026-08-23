/**
 * How tall the board is. Both exports carry the same expression — one as a
 * maximum for the picture, one as a flat height for the empty placeholder — and
 * it is spelled out twice because a class assembled from a template is a class
 * Tailwind's scanner never sees. Change one and change the other.
 *
 * `60vh` is what the map wants and what a tall screen gives it. Everything
 * around it is measured in pixels and does not shrink with the viewport, so the
 * middle term takes over below 1190px: whatever height is left after 29.75rem
 * has been set aside for the bar, the title, the marks and the page's own
 * padding.
 *
 * THE NUMBER HAS NOT MOVED, AND THAT IS DELIBERATE. It used to count a health
 * band under the board; those bars are inside the party cards now, so the height
 * has crossed from below the map to beside it. Handing the reserve back to the
 * map would make the row TALLER for a full party, not shorter — the row is as
 * tall as the tallest of the log, the board and the rail, and only the rail
 * grows with the party.
 *
 * The `16rem` floor is for the window nobody browses in: under 476px of
 * viewport the middle term goes negative, and a height cannot be.
 */

/** The picture's ceiling — its width is left `auto`, so the ratio survives. */
export const MAP_MAX_HEIGHT_CLASS =
  "max-h-[clamp(16rem,100vh_-_29.75rem,60vh)]";

/** The "no map" panel, which has no ratio to keep and takes the height flat. */
export const MAP_HEIGHT_CLASS = "h-[clamp(16rem,100vh_-_29.75rem,60vh)]";
