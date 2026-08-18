/**
 * The two text rules every form in the app has to apply the same way.
 *
 * Both were bugs before they were helpers, and both are the kind that hide: one
 * made a length limit smaller than it claimed, the other made it larger. They
 * live here rather than beside one of the forms because the day a second form
 * reimplements either of them is the day the two disagree.
 */

/**
 * A textarea's value as the rule layer should see it.
 *
 * A textarea has two values, and they are not the same string. Its API value —
 * what `.value` returns and what `maxlength` counts — uses LF for a line break.
 * Its *submission* value, the one that arrives in FormData, uses CRLF. So for
 * every time the user pressed Enter, the string this function receives is one
 * character longer than the one the browser let them type.
 *
 * That is the whole of the "2000 characters, or a bit less, is rejected as over
 * 2000" bug: the real ceiling was 2000 minus the number of paragraph breaks,
 * while the counter above the box cheerfully read 1985/2000.
 *
 * `\r\n?` rather than `\r\n`, because this also runs on the server against a
 * request nobody has to have built with a browser, and a lone CR should not
 * survive into the database either.
 */
export function readProse(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/**
 * Length in code points rather than UTF-16 units, matching Postgres's
 * `char_length` — which is what the tables' CHECK constraints use.
 *
 * `.length` would count a single astral character such as 🐉 as two, so a
 * one-character name would pass an "at least 2" check here and be rejected by
 * the database, where it counts as one.
 */
export function countCharacters(value) {
  return Array.from(String(value ?? "")).length;
}
