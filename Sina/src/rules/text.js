/** The two text rules every form in the app has to apply the same way. */

/**
 * A textarea's API value (what `.value` and `maxlength` see) breaks lines with
 * LF, but its submission value — what lands in FormData — uses CRLF, so every
 * Enter costs one character against the limit the counter displayed.
 *
 * `\r\n?` rather than `\r\n`: this also runs server-side against requests not
 * built with a browser, and a lone CR should not reach the database either.
 */
export function readProse(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/**
 * Code points, not UTF-16 units, matching the `char_length` the CHECK
 * constraints use — `.length` counts 🐉 as two and the database as one.
 */
export function countCharacters(value) {
  return Array.from(String(value ?? "")).length;
}
