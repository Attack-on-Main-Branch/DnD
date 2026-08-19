import { CHANGELOG } from "./changelog";

/**
 * The changelog's contents, as markup rather than as a program.
 *
 * A separate file from the panel because the panel needs the browser, and
 * everything in a Client Component's module graph goes with it. That shipped a
 * few thousand words of static English as JavaScript to every signed-in visitor
 * on every dashboard route, for a drawer most never open.
 *
 * Passed in as `children`: the panel keeps its state, the prose travels as HTML.
 */
export default function ChangelogEntries() {
  return (
    <ol className="flex flex-col gap-8">
      {CHANGELOG.map((entry) => (
        <li key={entry.version}>
          <h3 className="font-display text-base font-semibold tracking-wide text-ink">
            {entry.title}
          </h3>

          <p className="mt-0.5 font-mono text-[0.7rem] tracking-wide text-ink/45">
            <time dateTime={entry.date}>{entry.date}</time> · v{entry.version}
          </p>

          {entry.changes && (
            <Section label="New" items={entry.changes} accent />
          )}
          {entry.fixes && <Section label="Fixed" items={entry.fixes} />}
        </li>
      ))}
    </ol>
  );
}

function Section({ label, items, accent = false }) {
  return (
    <>
      <p
        className={`mt-4 font-display text-[0.7rem] tracking-[0.18em] uppercase ${
          accent ? "text-gold/75" : "text-ink/45"
        }`}
      >
        {label}
      </p>

      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="relative pl-4 text-sm leading-relaxed text-pretty text-ink/70 before:absolute before:top-[0.6em] before:left-0 before:size-1 before:rounded-full before:bg-gold/50"
          >
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}
