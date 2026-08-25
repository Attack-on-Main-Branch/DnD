"use client";

import { useState, useTransition } from "react";
import { CANTRIP_LEVEL, spellDiceAt } from "sina/rules/spells";

import SpellDetail, { EmptySpellbook } from "@/app/dashboard/spell-detail";
import SpellRow from "@/app/dashboard/spell-row";
import {
  castDamageLine,
  castSaveLine,
  spellsByShelf,
} from "@/app/dashboard/spell-presentation";

import { useDiceTable } from "./dice-table";
import { Action, Confirm } from "./pack-controls";
import { moveSpellSlot, teachSpell, unlearnSpell } from "./spell-actions";
import SpellCastControl from "./spell-cast-control";
import SpellSearch from "./spell-search";
import Shelf from "./spell-shelf";
import SpellSlotTracker from "./spell-slot-tracker";
import {
  PopoverAside,
  POPOVER_BODY_CLASSES,
  POPOVER_BODY_SHORT_CLASSES,
  usePopoverOpen,
} from "./table-popover";
import { useTableMarks } from "./table-marks";
import { useActivityLog } from "./use-activity";

/**
 * A player's own spellbook: a page of names, the one chosen read out underneath,
 * and the slots at the foot.
 *
 * ONE SPELL IS OPEN AT A TIME and may have come from either list, which is what
 * decides the panel's footer: `Learn`, or `Cast` and `Forget`.
 *
 * Casting goes slot, close, dice, log, in that order and no other. The slot is
 * atomic and can refuse — the last 3rd spent by another browser a moment ago —
 * and a refused cast must not reach the dice or the log; the book closes because
 * the arena is the map and the map is behind this panel; the log goes last so
 * the line carries the number. A cantrip skips the first step and only that one.
 */
export default function PlayerSpellDrawer({
  campaignId,
  characterId,
  book,
  caster,
  onWritten,
  onSlotsWritten,
}) {
  const [reading, setReading] = useState(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [isPending, startTransition] = useTransition();

  const record = useActivityLog(campaignId);
  const { cast: throwDice } = useDiceTable();
  const { close } = useTableMarks();

  const shelves = spellsByShelf(book);
  const known = new Set(book.map((row) => row.spell_slug));

  /* Held as a spell rather than a slug, because half of what can be open is a
     search hit in no list this component keeps. Re-read out of the book once it
     IS known, so learning one turns the footer over without a second press. */
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

  /** `tell` is which bell it rings: the book changed, or the slots did. */
  function answer(result, said, tell = onWritten) {
    if (result?.kind === "rejected") {
      setError(result.message);
      setNote(null);
      return false;
    }

    setError(null);
    setNote(said);
    tell(characterId);
    return true;
  }

  function learn(spell) {
    startTransition(async () => {
      const result = await teachSpell(campaignId, [characterId], spell);

      if (answer(result, `${spell.name} written into the book.`)) {
        setReading(null);
      }
    });
  }

  /** `slotLevel` is the slot it is cast FROM, and zero for a cantrip. */
  function cast(spell, slotLevel) {
    startTransition(async () => {
      if (slotLevel > CANTRIP_LEVEL) {
        const paid = await moveSpellSlot(campaignId, characterId, slotLevel, 1);

        if (!answer(paid, null, onSlotsWritten)) {
          return;
        }
      } else {
        setError(null);
      }

      close();

      // A cantrip scales with its caster and a levelled spell with its slot.
      const at = slotLevel > CANTRIP_LEVEL ? slotLevel : caster.level;
      const dice = spellDiceAt(spell, at);
      const thrown = dice ? await throwDice(dice) : null;

      const damage = castDamageLine(spell, at);

      setNote(
        thrown === null
          ? `${spell.name} cast.`
          : `${spell.name} cast — ${thrown}.`,
      );

      record(characterId, {
        action: "spell_cast",
        spellName: spell.name,
        spellLevel: slotLevel,
        // The dice AND what they came to: this throw is not mirrored at the
        // other chairs, so the log is where the table learns the number.
        spellDamage:
          damage && thrown !== null ? `${damage} ➔ ${thrown}` : damage,
        spellSave: castSaveLine(spell, caster.casting),
      });
    });
  }

  function forget(spell) {
    startTransition(async () => {
      const result = await unlearnSpell(campaignId, characterId, spell.slug);

      if (answer(result, `${spell.name} struck out.`)) {
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
        <SpellSearch
          campaignId={campaignId}
          openSlug={open?.slug ?? null}
          onOpen={show}
        />

        {book.length === 0 ? (
          <div className="mt-4">
            <EmptySpellbook description="Search above for a spell, and what you learn will be shelved here by its level." />
          </div>
        ) : (
          <>
            <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
              {book.length} known
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

      {/* A player reads the bar and does not move it — see the tracker. */}
      <SpellSlotTracker
        campaignId={campaignId}
        characterId={characterId}
        slots={caster.slots}
        classId={caster.classId}
        level={caster.level}
      />

      {open && (
        <PopoverAside>
          <SpellDetail spell={open}>
            {known.has(open.slug) ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Action
                    onClick={() => setAsking(!asking)}
                    disabled={isPending}
                    pressed={asking}
                    tone="danger"
                    label={`Forget ${open.name}`}
                  >
                    Forget
                  </Action>

                  <SpellCastControl
                    spell={open}
                    slots={caster.slots}
                    classId={caster.classId}
                    level={caster.level}
                    disabled={isPending}
                    onCast={(slotLevel) => cast(open, slotLevel)}
                  />
                </div>

                {asking && (
                  <Confirm question={`Forget ${open.name}?`}>
                    <Action onClick={() => setAsking(false)} label="Keep it">
                      Keep
                    </Action>

                    <Action
                      onClick={() => forget(open)}
                      disabled={isPending}
                      tone="danger"
                      label={`Confirm forgetting ${open.name}`}
                    >
                      Forget it
                    </Action>
                  </Confirm>
                )}
              </>
            ) : (
              <div className="flex items-center justify-end">
                <Action
                  onClick={() => learn(open)}
                  disabled={isPending || open.level === null}
                  tone="gold"
                  label={`Learn ${open.name}`}
                >
                  Learn
                </Action>
              </div>
            )}
          </SpellDetail>
        </PopoverAside>
      )}
    </div>
  );
}
