/**
 * How big the board is. All three exports carry the same expressions — the
 * height twice, once as a maximum for the picture and once as a flat height for
 * the empty placeholder — and they are spelled out rather than assembled because
 * a class built from a template is a class Tailwind's scanner never sees. Change
 * one and change the other.
 *
 * THE WIDTH IS A CEILING OF ITS OWN, and it is what the board is measured by:
 * the map should stand at 60% of the window. It goes on the STAGE — the box the
 * glass mat is hung off — and never on the picture, which is the whole of what
 * went wrong the first time this was written. `w-fit` sizes that box from what
 * the picture would be at its height ceiling; a second, smaller ceiling on the
 * picture alone left the box 19px wider than what was inside it, and the mat,
 * being `-inset-6` of the BOX, stood proud of the map down its right-hand edge.
 * One ceiling, on the outer box, and `max-w-full` on the picture to follow it:
 * then the two cannot disagree and the mat is the same 1.5rem on all four sides.
 *
 * No `min(100%, …)` either, for the same reason — a percentage resolved against
 * a `w-fit` ancestor is a circular question, and the answer browsers give during
 * intrinsic sizing is not the one they give afterwards. The column is kept by
 * the flex row instead: `min-w-0` on the stage lets it give way.
 *
 * THE HEIGHT IS WHAT LETS IT GET THERE. A map is a picture with a ratio, so its
 * width is only ever as large as its height allows: at 2560 by 1320 the old
 * ceiling gave a 3:2 map 1224px, which is 48% of the window, and no width rule
 * could have widened it without squashing the picture. `76vh` and a 20rem
 * reserve are what turn that same map into 1527px — 60% — with the page still
 * ending exactly at the fold.
 *
 * THE RESERVE IS MEASURED AND NOT GUESSED: 75px of site header, 48px of the
 * page's own padding, 40px of title, two 16px row gaps, 72px of marks and the
 * 48px of glass mat standing proud of the picture come to 315px. 20rem is 320.
 * It used to be 29.75rem, which still counted a health band under the board;
 * those bars are inside the party cards now, so the height crossed from below
 * the map to beside it — and beside it costs the row nothing until the map grows
 * taller than the rail.
 *
 * Everything around the board is measured in pixels and does not shrink with the
 * viewport, so the middle term takes over below 1250px of viewport height, and
 * the `16rem` floor below 576px — under which the middle term is smaller than
 * the smallest board worth drawing.
 *
 * BELOW ABOUT 2200px OF WINDOW IT IS THE COLUMN THAT DECIDES, not either
 * ceiling: the log and the party rail are 20rem each and do not give way, so a
 * 1440px window seats a 481px board however tall it is allowed to be. That is
 * the layout's own answer and not this file's.
 */

/** The board's ceiling — 60% of the window. On the stage, not on the picture. */
export const MAP_MAX_WIDTH_CLASS = "max-w-[60vw]";

/** The other ceiling. Both are maxima, so the browser keeps the ratio. */
export const MAP_MAX_HEIGHT_CLASS = "max-h-[clamp(16rem,100vh_-_20rem,76vh)]";

/** The "no map" panel, which has no ratio to keep and takes the height flat. */
export const MAP_HEIGHT_CLASS = "h-[clamp(16rem,100vh_-_20rem,76vh)]";
