"use client";

import { useState, useTransition } from "react";
import { MAX_NOTE_LENGTH } from "sina/rules/character";
import { countCharacters } from "sina/rules/text";

import { controlClasses } from "@/app/components/ui/field-styles";
import ParchmentScroll from "@/app/components/ui/parchment-scroll";
import { NOTE_TIME_FORMAT } from "@/lib/dates";

import { writeTableNote } from "./actions";
import TablePopover from "./table-popover";

/**
 * The scroll above the map, and the notes behind it. The panel, the halo, the
 * shake and the unfold are TablePopover's; what is here is the writing.
 *
 * Which notebook it opens is the seat's, not the account's — load-table.js
 * decides, and this only prints the name it is given.
 *
 * `sina/rules/text` rather than `sina/rules/character` for the counter: this
 * runs in the browser, and the catalogues in that neighbour would come with it.
 */
export default function NotesScroll({ campaignId, seat }) {
  const { characterId, title, notes } = seat;

  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  /* A counter, not a flag: TablePopover uses it as a `key`, and changing a key
     is what restarts a CSS animation. */
  const [written, setWritten] = useState(0);

  const length = countCharacters(draft);
  const tooLong = length > MAX_NOTE_LENGTH;
  const empty = draft.trim().length === 0;

  function save() {
    if (empty || tooLong || isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await writeTableNote(campaignId, characterId, draft);

      if (result?.kind === "rejected") {
        setError(result.message);
        return;
      }

      setDraft("");
      setWritten((count) => count + 1);
    });
  }

  return (
    <TablePopover
      icon={ParchmentScroll}
      markClass="glow-bloom"
      label={
        notes.length > 0
          ? `Notes as ${title}, ${notes.length} written`
          : `Notes as ${title}`
      }
      title={`${title}\u2019s notes`}
      count={notes.length}
      arrival={written}
      onShortcut={save}
    >
      <div className="px-5 pt-4 pb-3">
        {/* The box is `rows` tall; its width is the panel's, in
            table-popover.jsx. */}
        <textarea
          rows={6}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isPending}
          placeholder="What happened at the table…"
          aria-label="Write a note"
          aria-invalid={tooLong || undefined}
          className={controlClasses({
            invalid: tooLong,
            className: "scroll-gold resize-none",
          })}
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p
            className={`font-mono text-[10px] tracking-[0.16em] tabular-nums uppercase ${
              tooLong ? "text-red-300" : "text-ink/45"
            }`}
          >
            {length} / {MAX_NOTE_LENGTH}
          </p>

          <button
            type="button"
            onClick={save}
            disabled={isPending || empty || tooLong}
            className="cursor-pointer font-display text-sm tracking-wide text-gold transition-colors duration-300 hover:text-ink disabled:cursor-not-allowed disabled:text-ink/30"
          >
            {isPending ? "Writing…" : "Write it down"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="px-5 pt-1 pb-6 text-center text-sm text-ink/50 italic">
          Nothing written yet.
        </p>
      ) : (
        <ul className="scroll-gold max-h-86 overflow-y-auto border-t border-gold/10">
          {notes.map((note) => (
            <li
              key={note.id}
              className="border-b border-gold/10 px-5 py-3 last:border-b-0"
            >
              <time
                dateTime={note.created_at}
                className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase"
              >
                {NOTE_TIME_FORMAT.format(new Date(note.created_at))}
              </time>

              <p className="mt-1 text-sm whitespace-pre-wrap text-ink/75">
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </TablePopover>
  );
}
