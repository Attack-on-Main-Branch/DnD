"use client";

import { useState, useTransition } from "react";

import SpellDetail from "@/app/dashboard/spell-detail";
import SpellRow from "@/app/dashboard/spell-row";
import { spellsByShelf } from "@/app/dashboard/spell-presentation";

import { Action, Confirm } from "./pack-controls";
import PartyPills, { Pill } from "./party-pills";
import { teachSpell, unlearnSpell } from "./spell-actions";
import SpellSearch from "./spell-search";
import Shelf from "./spell-shelf";
import SpellSlotTracker from "./spell-slot-tracker";
import {
  PopoverAside,
  POPOVER_BODY_CLASSES,
  POPOVER_BODY_SHORT_CLASSES,
  usePopoverOpen,
} from "./table-popover";

/**
 * The Dungeon Master's side of the spellbook. The pill bar aims both halves:
 * "All party" is a TARGET and not a view, so choosing it puts the shelves away
 * and leaves the teaching.
 *
 * Casting is not offered here — it is the caster's own turn. The SLOTS are,
 * because nobody else's chair can give one back: `restore_spell_slot` refuses a
 * character's own owner outright.
 */

const EVERYONE = "all";

export default function DmSpellDrawer({
  campaignId,
  members,
  books,
  casters,
  onWritten,
  onSlotsWritten,
}) {
  const [target, setTarget] = useState(EVERYONE);
  const [reading, setReading] = useState(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [isPending, startTransition] = useTransition();

  const selected = members.find((member) => member.id === target) ?? null;
  const targets = selected ? [selected.id] : members.map((member) => member.id);

  const book = selected ? (books.get(selected.id) ?? []) : [];
  const shelves = spellsByShelf(book);

  /* Only the chosen character's: with "all party" aimed, one of six already
     knowing a spell is not a reason to grey the control out. */
  const known = new Set(book.map((row) => row.spell_slug));

  /* Undefined where `campaign_sheets` returned no row — the party changed
     under an open panel. */
  const caster = selected ? casters[selected.id] : null;

  const shelved = shelves
    .flatMap((shelf) => shelf.spells)
    .find((spell) => spell.slug === reading?.slug);

  const open = shelved ?? reading;

  /* Closing the mark forgets what was open under it: the panel goes either way,
     and a spell still standing there when the book is next pressed is one
     nobody asked for. Adjusted during render rather than in an effect — React's
     own answer for state that has to follow something else. */
  const panelOpen = usePopoverOpen();
  const [wasOpen, setWasOpen] = useState(panelOpen);

  if (wasOpen !== panelOpen) {
    setWasOpen(panelOpen);
    setReading(null);
  }

  function show(spell) {
    setAsking(false);
    setReading((standing) => (standing?.slug === spell.slug ? null : spell));
  }

  function answer(result, said) {
    if (result?.kind === "rejected") {
      setError(result.message);
      setNote(null);
      return false;
    }

    setError(null);
    setNote(said);

    for (const id of targets) {
      onWritten(id);
    }

    return true;
  }

  function teach(spell) {
    startTransition(async () => {
      const result = await teachSpell(campaignId, targets, spell);

      const landed = answer(
        result,
        selected
          ? `${spell.name} taught to ${selected.name}.`
          : `${spell.name} taught to ${targets.length}.`,
      );

      if (landed) {
        setReading(null);
      }
    });
  }

  function take(spell) {
    startTransition(async () => {
      const result = await unlearnSpell(campaignId, selected.id, spell.slug);

      if (answer(result, `${spell.name} taken from ${selected.name}.`)) {
        setAsking(false);
        setReading(null);
      }
    });
  }

  return (
    /* A column, so the slot bar can be pinned by layout rather than by
       `position: sticky` — see the tracker. Shorter while a spell is open under
       it: the two panels hang off the marks together and the pair has to clear
       the bottom of the window. */
    <div
      className={`flex flex-col ${
        open ? POPOVER_BODY_SHORT_CLASSES : POPOVER_BODY_CLASSES
      }`}
    >
      {/* `min-h-0`, or a flex item will not shrink under its own content and
          the shelves would push the bar off the foot of the panel. */}
      <div className="scroll-gold min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
        <PartyPills
          members={members}
          chosen={target}
          onChoose={setTarget}
          label="Who learns it"
        >
          <Pill
            active={target === EVERYONE}
            onClick={() => setTarget(EVERYONE)}
            disabled={members.length === 0}
          >
            All party
            {members.length > 0 && (
              <span className="font-mono text-[10px] text-ink/50 tabular-nums">
                {members.length}
              </span>
            )}
          </Pill>
        </PartyPills>

        {members.length === 0 ? (
          <p className="mt-6 text-center text-sm text-ink/50 italic">
            Nobody has joined this party yet.
          </p>
        ) : (
          <>
            {/* Search first: teaching is why this drawer is open. */}
            <div className="mt-5">
              <SpellSearch
                campaignId={campaignId}
                openSlug={open?.slug ?? null}
                onOpen={show}
              />
            </div>

            {selected &&
              (book.length === 0 ? (
                <p className="mt-5 text-center text-sm text-ink/50 italic">
                  {selected.name} knows no spells.
                </p>
              ) : (
                <>
                  <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
                    {selected.name} · {book.length} known
                  </p>

                  {shelves.map((shelf) => (
                    <Shelf
                      key={shelf.level}
                      label={shelf.label}
                      count={shelf.spells.length}
                    >
                      {shelf.spells.map((spell) => (
                        <li key={spell.slug} className="flex">
                          <SpellRow
                            spell={spell}
                            open={open?.slug === spell.slug}
                            onOpen={() => show(spell)}
                          />
                        </li>
                      ))}
                    </Shelf>
                  ))}
                </>
              ))}
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs text-red-300">
            {error}
          </p>
        )}

        {note && !error && (
          <p role="status" className="mt-3 text-xs text-gold/75">
            {note}
          </p>
        )}
      </div>

      {caster && (
        <SpellSlotTracker
          campaignId={campaignId}
          characterId={selected.id}
          slots={caster.slots}
          classId={caster.classId}
          level={caster.level}
          editable
          onWritten={onSlotsWritten}
          onRefused={setError}
        />
      )}

      {open && (
        <PopoverAside>
          <SpellDetail spell={open}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {selected && known.has(open.slug) ? (
                <Action
                  onClick={() => setAsking(!asking)}
                  disabled={isPending}
                  pressed={asking}
                  tone="danger"
                  label={`Take ${open.name} from ${selected.name}`}
                >
                  Take it back
                </Action>
              ) : (
                <span />
              )}

              {!known.has(open.slug) && (
                <Action
                  onClick={() => teach(open)}
                  disabled={
                    isPending || open.level === null || members.length === 0
                  }
                  tone="gold"
                  label={
                    selected
                      ? `Teach ${open.name} to ${selected.name}`
                      : `Teach ${open.name} to the party`
                  }
                >
                  {selected ? `Teach ${selected.name}` : "Teach all"}
                </Action>
              )}
            </div>

            {asking && selected && known.has(open.slug) && (
              <Confirm question={`Take ${open.name} from ${selected.name}?`}>
                <Action onClick={() => setAsking(false)} label="Leave it">
                  Leave it
                </Action>

                <Action
                  onClick={() => take(open)}
                  disabled={isPending}
                  tone="danger"
                  label={`Confirm taking ${open.name} back`}
                >
                  Take it
                </Action>
              </Confirm>
            )}
          </SpellDetail>
        </PopoverAside>
      )}
    </div>
  );
}
