import { NOTE_TIME_FORMAT } from "@/lib/dates";

/**
 * A ledger of notes, newest first. Read-only: a note is written at the table,
 * and this is where it is read back.
 *
 * Shared by the character sheet and the campaign sheet, which show two
 * different books in the same shape — hence `components/` rather than either
 * route's own directory.
 */
export default function NoteList({ notes, emptyTitle, emptyDescription }) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gold/20 py-14 text-center">
        <p className="font-display text-base font-medium tracking-wide text-ink/80">
          {emptyTitle}
        </p>
        <p className="max-w-sm text-xs text-ink/50">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {notes.map((note) => (
        <li
          key={note.id}
          className="rounded-lg border border-gold/15 bg-surface/25 px-4 py-3"
        >
          <time
            dateTime={note.created_at}
            className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase"
          >
            {NOTE_TIME_FORMAT.format(new Date(note.created_at))}
          </time>

          <p className="mt-1.5 text-sm whitespace-pre-wrap text-ink/80">
            {note.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
