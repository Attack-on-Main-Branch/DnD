"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_NOTE_LENGTH } from "sina/rules/character";
import { countCharacters } from "sina/rules/text";

import { useToast } from "@/app/components/ui/toast";
import { controlClasses } from "@/app/components/ui/field-styles";
import ParchmentScroll from "@/app/components/ui/parchment-scroll";
import { NOTE_TIME_FORMAT } from "@/lib/dates";

import { eraseTableNote, reviseTableNote, writeTableNote } from "./actions";
import { Action, Confirm } from "./pack-controls";
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
 * All three actions hand the ledger back and this replaces it.
 *
 * EVERY LINE CAN BE REWRITTEN OR STRUCK OUT, and both are the pack's own text
 * controls rather than icons — the same Edit and Delete a player already knows
 * from Take it back and Give to. Nothing here is painted before it is written:
 * a note carries the database's own timestamp, so an optimistic line would be
 * dated by this browser's clock, and a rewrite that was refused would leave the
 * old sentence looking replaced.
 *
 * ONE LINE IS OPEN AT A TIME, whether for rewriting or for the question before
 * striking out — a ledger with three half-edited notes in it is a ledger nobody
 * can read.
 */
export default function NotesScroll({ campaignId, seat }) {
  const { characterId, title } = seat;
  const { show } = useToast();

  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState(seat.notes);

  /* Which line is open, and as what: `edit` is a textarea in place of the
     sentence, `erase` is the question above it. Held as one so pressing either
     closes the other. */
  const [open, setOpen] = useState(null);
  const [edited, setEdited] = useState("");

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

  const editedLength = countCharacters(edited);
  const editedTooLong = editedLength > MAX_NOTE_LENGTH;
  const editedEmpty = edited.trim().length === 0;

  /** What a rewrite and a strike-out do with an answer: the book, or a toast. */
  function landed(result) {
    if (result?.kind === "rejected") {
      show(result.message);
      return;
    }

    if (result?.notes) {
      setNotes(result.notes);
    }
  }

  /* The panel the press came from has closed by now, so a failure has nowhere
     to go but a toast — the rule every deed at this table is written under. */
  function failed() {
    show("That did not reach the table. Try again.");
  }

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

  /** The sentence as it stands, into the box that will replace it. */
  function edit(note) {
    setOpen((standing) =>
      standing?.id === note.id && standing.as === "edit"
        ? null
        : { id: note.id, as: "edit" },
    );

    setEdited(note.body);
  }

  function ask(note) {
    setOpen((standing) =>
      standing?.id === note.id && standing.as === "erase"
        ? null
        : { id: note.id, as: "erase" },
    );
  }

  /**
   * The box closes on the press and the old sentence stands until the answer
   * lands. A rewrite is the one deed here that has something to show while it
   * travels, and showing the new words early would say it had been kept.
   */
  function revise(note) {
    if (editedEmpty || editedTooLong) {
      return;
    }

    const body = edited;

    setOpen(null);

    reviseTableNote(campaignId, characterId, note.id, body).then(
      landed,
      failed,
    );
  }

  function erase(note) {
    setOpen(null);

    eraseTableNote(campaignId, characterId, note.id).then(landed, failed);
  }

  return (
    <TablePopover
      icon={ParchmentScroll}
      label={
        notes.length > 0
          ? `Notes as ${title}, ${notes.length} written`
          : `Notes as ${title}`
      }
      title={`${title}’s notes`}
      count={notes.length}
      arrival={written}
      /* Whichever box is under the cursor's care: a line being rewritten is
         what Ctrl+Enter means while one is open, and the composer otherwise. */
      onShortcut={() => {
        const editing =
          open?.as === "edit" && notes.find((one) => one.id === open.id);

        if (editing) {
          revise(editing);
          return;
        }

        save();
      }}
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
            {notes.map((note) => {
              const editing = open?.id === note.id && open.as === "edit";
              const asking = open?.id === note.id && open.as === "erase";

              return (
                <li
                  key={note.id}
                  className="border-b border-gold/10 px-5 py-3 last:border-b-0"
                >
                  {/* The date and the two verbs on one line: the sentence
                      underneath is the note, and a control beside it would be
                      read as part of what was written. */}
                  <div className="flex items-center justify-between gap-2">
                    <time
                      dateTime={note.created_at}
                      className="min-w-0 truncate font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase"
                    >
                      {NOTE_TIME_FORMAT.format(new Date(note.created_at))}
                    </time>

                    <div className="flex shrink-0 items-center gap-1">
                      <Action
                        onClick={() => edit(note)}
                        pressed={editing}
                        label="Rewrite this note"
                      >
                        Edit
                      </Action>

                      <Action
                        onClick={() => ask(note)}
                        pressed={asking}
                        tone="danger"
                        label="Strike this note out"
                      >
                        Delete
                      </Action>
                    </div>
                  </div>

                  {editing ? (
                    <div className="mt-2">
                      <textarea
                        rows={4}
                        value={edited}
                        onChange={(event) => setEdited(event.target.value)}
                        aria-label="Rewrite this note"
                        aria-invalid={editedTooLong || undefined}
                        className={controlClasses({
                          invalid: editedTooLong,
                          className: "scroll-gold resize-none",
                        })}
                      />

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <p
                          className={`font-mono text-[10px] tracking-[0.16em] tabular-nums uppercase ${
                            editedTooLong ? "text-red-300" : "text-ink/45"
                          }`}
                        >
                          {editedLength} / {MAX_NOTE_LENGTH}
                        </p>

                        <div className="flex items-center gap-2">
                          <Action
                            onClick={() => setOpen(null)}
                            label="Leave the note as it was"
                          >
                            Cancel
                          </Action>

                          <Action
                            onClick={() => revise(note)}
                            disabled={editedEmpty || editedTooLong}
                            tone="gold"
                            label="Keep the rewritten note"
                          >
                            Rewrite it
                          </Action>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm whitespace-pre-wrap text-ink/75">
                      {note.body}
                    </p>
                  )}

                  {asking && (
                    <Confirm question="Strike this note out?">
                      <Action onClick={() => setOpen(null)} label="Keep it">
                        Keep
                      </Action>

                      <Action
                        onClick={() => erase(note)}
                        tone="danger"
                        label="Confirm striking this note out"
                      >
                        Delete it
                      </Action>
                    </Confirm>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </TablePopover>
  );
}
