import { TITLE_CLASSES } from "./entrance";

/**
 * The campaign's name over the table, arriving as two halves that slide toward
 * each other while their kerning collapses shut.
 *
 * Split by code point, not by `.length`: a UTF-16 index can land inside a
 * surrogate pair and cut a character in two. The seam falls mid-word as often
 * as not, which is invisible once the tracking has closed. The halves would be
 * two nonsense words announced, so the name is read from the `sr-only` copy.
 */
export default function TableTitle({ title }) {
  const glyphs = [...title];
  const seam = Math.ceil(glyphs.length / 2);

  return (
    <h1 className="text-center font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
      <span className="sr-only">{title}</span>

      {/* `whitespace-pre` so a space that falls on the seam is kept rather than
          collapsed away, which would close the join by a word space. */}
      <span aria-hidden="true" className="flex justify-center whitespace-pre">
        <span className={TITLE_CLASSES.left}>
          {glyphs.slice(0, seam).join("")}
        </span>
        <span className={TITLE_CLASSES.right}>
          {glyphs.slice(seam).join("")}
        </span>
      </span>
    </h1>
  );
}
