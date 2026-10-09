/**
 * How tall the board may stand. All three exports carry the same expression —
 * once as a maximum for the picture and once as a flat height for the empty
 * placeholder — spelled out rather than assembled because a class built from a
 * template is a class Tailwind's scanner never sees. Change one and change the
 * others.
 *
 * NO WIDTH CEILING. The board's column is what decides its width: the log and
 * the party rail either side are measured in rem, and the table's rem follows
 * the window (see `data-table-scale` in globals.css), so the furniture keeps
 * one share of every monitor and the board takes whatever is left. A ceiling
 * of its own only ever stopped it short of the room it had. The stage is
 * `w-fit min-w-0`, so the flex row is what makes it give way — and the picture
 * follows with `max-w-full`, which keeps the glass mat the same 1.5rem on all
 * four sides.
 *
 * THE HEIGHT IS THE WINDOW LESS A MEASURED RESERVE, for maps squarer than the
 * window: 1rem of the page's padding top and bottom, 2.5rem of the name, 3rem
 * of the marks under it, two 0.75rem row gaps, the 1.5rem the marks' row keeps
 * clear for the glass mat over the picture, and the mat's 1.5rem under it —
 * 12rem. No site header: HeaderFold folds it away on this page. Being rem,
 * the reserve scales with the furniture it stands for. The `16rem` floor is
 * the smallest board worth drawing.
 */

/** The ceiling. A maximum, so the browser keeps the picture's ratio. */
export const MAP_MAX_HEIGHT_CLASS = "max-h-[max(16rem,100vh_-_12rem)]";

/** The "no map" panel, which has no ratio to keep and takes the height flat. */
export const MAP_HEIGHT_CLASS = "h-[max(16rem,100vh_-_12rem)]";

/** Keep a centered board clear of the title above and map controls below. */
export const MAP_MAX_HEIGHT_TOOLS_CLASS = "max-h-[max(16rem,100vh_-_20rem)]";
