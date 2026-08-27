"use client";

import { useState } from "react";
import { CANTRIP_LEVEL } from "sina/rules/spells";

import SpellDetail, { EmptySpellbook } from "@/app/dashboard/spell-detail";
import SpellRow from "@/app/dashboard/spell-row";
import {
  castDamageLine,
  castSaveLine,
  spellsByShelf,
} from "@/app/dashboard/spell-presentation";

import { Action, Confirm } from "./pack-controls";
import { moveSpellSlot, teachSpell, unlearnSpell } from "./spell-actions";
import SpellCastControl from "./spell-cast-control";
import SpellSearch from "./spell-search";
import Shelf from "@/app/dashboard/spell-shelf";
import SpellSlotTracker from "./spell-slot-tracker";
import {
  PopoverAside,
  POPOVER_BODY_CLASSES,
  POPOVER_BODY_SHORT_CLASSES,
  usePopoverOpen,
} from "./table-popover";
import { useTableMarks } from "./table-marks";
import { useTableStore } from "./table-state";
import { useActivityLog } from "./use-activity";
import { useTableDeed } from "./use-table-deed";

/**
 * A player's own spellbook: a page of names, the one chosen read out underneath,
 * and the slots at the foot.
 *
 * ONE SPELL IS OPEN AT A TIME and may have come from either list, which is what
 * decides the panel's footer: `Learn`, or `Cast` and `Forget`.
 *
 * Casting goes slot, close, log, in that order and no other. The slot is atomic
 * and can refuse — the last 3rd spent by another browser a moment ago — and a
 * refused cast must not reach the log; the book closes because the map behind
 * this panel is what the table is looking at. A cantrip skips the first step and
 * only that one.
 *
 * NOTHING IS ROLLED HERE. The log carries the spell's own notation — "8d6 Fire"
 * — and the dice rail beside the map is where a caster throws it, with the same
 * handful everybody else at the table can see land.
 *
 * A CAST IS THE ONE DEED HERE THAT STILL WAITS: the pip goes out on the press,
 * but the round trip confirming it is awaited before the line is written,
 * because a refused slot must not become an entry saying it was cast.
 */
export default function PlayerSpellDrawer({
  campaignId,
  characterId,
  actorName,
  book,
  caster,
}) {
  const [reading, setReading] = useState(null);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState(null);

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);
  const record = useActivityLog(campaignId);
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

  /** Whatever a refusal here has to go and re-read: this seat's own book. */
  const want = { spells: true, characterIds: [characterId] };

  /**
   * The status line goes up on the press. A refusal takes it back down: the line
   * outlives the toast, and the two would answer one press differently.
   */
  function said(result) {
    if (!result) {
      setNote(null);
    }
  }

  function learn(spell) {
    setNote(`${spell.name} written into the book.`);
    setReading(null);

    run({
      // Nothing to paint: a learned spell is a row carrying the whole of what
      // the SRD says about it, so it arrives with the answer instead.
      work: () => teachSpell(campaignId, [characterId], spell),

      tell: (result) => {
        store.sync(result);
        send({ kind: "spell", characterId });
      },

      want,
    }).then(said);
  }

  /** `slotLevel` is the slot it is cast FROM, and zero for a cantrip. */
  async function cast(spell, slotLevel) {
    if (slotLevel > CANTRIP_LEVEL) {
      const paid = await run({
        paint: () => store.moveSlot(characterId, slotLevel, 1),

        work: () => moveSpellSlot(campaignId, characterId, slotLevel, 1),
        tell: () => send({ kind: "slots", characterId }),
        want: { seatCharacterId: characterId },
      });

      // Refused: the toast has said so and the pip has gone back. A cast that
      // was not paid for must not reach the log.
      if (!paid) {
        return;
      }
    }

    close();

    // A cantrip scales with its caster and a levelled spell with its slot.
    const at = slotLevel > CANTRIP_LEVEL ? slotLevel : caster.level;

    const spellDamage = castDamageLine(spell, at);
    const spellSave = castSaveLine(spell, caster.casting);

    setNote(`${spell.name} cast.`);

    record(
      characterId,
      {
        action: "spell_cast",
        spellName: spell.name,
        spellLevel: slotLevel,
        // What it throws, not what it threw: the rail is where the dice are.
        spellDamage,
        spellSave,
      },
      /* The line to stand in the panel until the real one lands. A cast is one
         of the few things no row change can be read back from, so it is still
         written by a call of its own — see log-actions.js. */
      {
        action: "spell_cast",
        actor: actorName,
        spell: spell.name,
        level: slotLevel,
        damage: spellDamage,
        save: spellSave,
      },
    );
  }

  function forget(spell) {
    setAsking(false);
    setReading(null);
    setNote(`${spell.name} struck out.`);

    run({
      paint: () => store.forgetSpell(characterId, spell.slug),

      work: () => unlearnSpell(campaignId, characterId, spell.slug),
      tell: () => send({ kind: "spell", characterId }),
      want,
    }).then(said);
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

        {note && (
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
                  disabled={open.level === null}
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
