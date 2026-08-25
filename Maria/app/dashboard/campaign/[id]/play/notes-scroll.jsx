"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_NOTE_LENGTH } from "sina/rules/character";
import { countCharacters } from "sina/rules/text";

import { useToast } from "@/app/components/ui/toast";
import { controlClasses } from "@/app/components/ui/field-styles";
import ParchmentScroll from "@/app/components/ui/parchment-scroll";
import { NOTE_TIME_FORMAT } from "@/lib/dates";

import { writeTableNote } from "./actions";
import TablePopover, { POPOVER_BODY_CLASSES } from "./table-popover";

/**
 * The scroll above the map, and the notes behind it. The panel, the halo, the
 * shake and the unfold are TablePopover's; what is here is the writing.
 *
 * Which notebook it opens is the seat's, not the account's — load-table.js
 * decides, and this only prints the name it is given.
 *
 * `sina/rules/text` rather than `sina/rules/character` for the counter: this
 * runs in the browser, and the catalogues in that neighbour would come with it.
 *
 * THE LEDGER IS HELD HERE rather than revalidated: a note belongs to its writer
 * alone, so there is nothing to tell the table and nothing to reconcile with.
 * The action hands the ledger back and this replaces it.
 */
export default function NotesScroll({ campaignId, seat }) {
  const { characterId, title } = seat;
  const { show } = useToast();

  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState(seat.notes);

  /* A fresh array on every route render, which is the only time it should
     replace what this browser is holding. */
  const adopted = useRef(seat.notes);

  useEffect(() => {
    if (adopted.current === seat.notes) {
      return;
    }

    adopted.current = seat.notes;
    setNotes(seat.notes);
  }, [seat.notes]);

  /* A counter, not a flag: TablePopover uses it as a `key`, and changing a key
     is what restarts a CSS animation. */
  const [written, setWritten] = useState(0);

  const length = countCharacters(draft);
  const tooLong = length > MAX_NOTE_LENGTH;
  const empty = draft.trim().length === 0;

  function save() {
    if (empty || tooLong) {
      return;
    }

    const body = draft;

    /* Emptied on the press, but nothing is drawn optimistically: a note carries
       a timestamp, and one made here would be this browser's clock rather than
       the transaction's. */
    setDraft("");

    writeTableNote(campaignId, characterId, body).then(
      (result) => {
        if (result?.kind === "rejected") {
          show(result.message);
          // Given back rather than lost, unless something has been typed since.
          setDraft((standing) => (standing === "" ? body : standing));
          return;
        }

        if (result?.notes) {
          setNotes(result.notes);
        }

        setWritten((count) => count + 1);
      },
      () => {
        show("That did not reach the table. Try again.");
        setDraft((standing) => (standing === "" ? body : standing));
      },
    );
  }

  return (
    <TablePopover
      icon={ParchmentScroll}
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
      {/* The composer keeps its size, the ledger takes what is left. */}
      <div className={`flex flex-col ${POPOVER_BODY_CLASSES}`}>
        <div className="shrink-0 px-5 pt-4 pb-3">
          {/* The box is `rows` tall; its width is the panel's, in
            table-popover.jsx. */}
          <textarea
            rows={6}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
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
              disabled={empty || tooLong}
              className="cursor-pointer font-display text-sm tracking-wide text-gold transition-colors duration-300 hover:text-ink disabled:cursor-not-allowed disabled:text-ink/30"
            >
              Write it down
            </button>
          </div>
        </div>

        {notes.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-5 pb-6 text-center text-sm text-ink/50 italic">
            Nothing written yet.
          </p>
        ) : (
          <ul className="scroll-gold min-h-0 flex-1 overflow-y-auto border-t border-gold/10">
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
      </div>
    </TablePopover>
  );
}
