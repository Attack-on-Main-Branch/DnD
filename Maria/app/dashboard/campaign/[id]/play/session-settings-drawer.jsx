"use client";

import { useState } from "react";
import { longRestSlotLevels, shortRestSlotLevels } from "sina/rules/rest";

import HoverNote from "@/app/components/ui/hover-note";
import MultiSelectMenu from "@/app/components/ui/multi-select-menu";
import { StepButton } from "@/app/components/ui/quantity-stepper";
import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";

import { takeRest } from "./session-actions";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";
import XpBar, { XpStepper } from "./xp-bar";

/**
 * Session management: who the panel is aimed at, the two rests, and the
 * experience under them.
 *
 * ONE MENU AIMS BOTH HALVES, and it is the chest's own `MultiSelectMenu`: rows
 * toggle, the list stays open, and a subset is an ordinary answer — both writers
 * read a list and narrow it themselves. The bar appears for a single character
 * only; six at once is more than this panel can show.
 *
 * The head of the table's alone, so every deed here is filed under that chair.
 * A rest paints before it writes, in the shape the server answers with.
 */

export default function SessionSettingsDrawer({
  campaignId,
  members,
  onLevelled,
}) {
  const [chosen, setChosen] = useState(() => members.map((one) => one.id));

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  /* Whoever is still in the party: it can change under an open panel, and the
     database would narrow a departed character away regardless. */
  const aimed = chosen.filter((id) => members.some((one) => one.id === id));

  const alone =
    aimed.length === 1
      ? (members.find((one) => one.id === aimed[0]) ?? null)
      : null;

  const whom = alone
    ? `for ${alone.name}`
    : aimed.length >= members.length
      ? "for the whole party"
      : `for ${aimed.length} of the party`;

  /**
   * The rows a rest lands on, read out of the store at the moment of the press
   * rather than subscribed to: this panel does not redraw for a pip somebody
   * else spent, it only has to know where everybody stood when the button went
   * down.
   */
  function waking(restType) {
    const held = store.read();
    const reaches =
      restType === "long" ? longRestSlotLevels : shortRestSlotLevels;

    return aimed.map((id) => {
      const bar = held.health[id];
      const classId = members.find((one) => one.id === id)?.class_id;

      const woken = { ...(held.slots[id] ?? {}) };

      for (const slot of reaches(classId, held.levels[id])) {
        if (woken[slot]) {
          woken[slot] = { ...woken[slot], used: 0 };
        }
      }

      return {
        id,
        currentHp: restType === "long" ? bar?.max : bar?.current,
        spellSlots: woken,
      };
    });
  }

  function rest(restType) {
    const painted = waking(restType);

    run({
      paint: () => store.rested(painted),

      work: () => takeRest(campaignId, aimed, restType),

      tell: (result) => {
        // The database's own numbers over the painted ones, and then the room.
        store.rested(result.rested ?? []);

        /* ONE doorbell for the deed, however many characters woke: a rest moves
           a bar and up to nine pips each, and none of it has been through a
           `select()` list. The other chairs go and read it — see party-rail. */
        if ((result.rested ?? []).length > 0) {
          send({ kind: "rest" });
        }
      },

      /* The party for the bars, the sheets for the slots — a refusal has to
         re-read both, and neither can be worked back out of the other. */
      want: { party: true, sheets: true, activity: true },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <MultiSelectMenu
        label="Who this is for"
        options={members.map((member) => ({
          value: member.id,
          label: member.name,
        }))}
        value={aimed}
        onChange={setChosen}
        everything="All party"
        disabled={members.length === 0}
      />

      <div aria-hidden="true" className={FADED_RULE_CLASSES} />

      <section aria-label="Rest">
        <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
          Rest
        </h3>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {/* `group/note` and `relative` are what the note hangs off — see
              hover-note.jsx. The span carries them rather than the button,
              which is `shrink-0` and would size itself to the note. */}
          <span className="group/note relative inline-flex">
            <StepButton
              wide
              tone="gold"
              onClick={() => rest("short")}
              disabled={aimed.length === 0}
              label={`Take a short rest ${whom}`}
            >
              Short rest
            </StepButton>

            <HoverNote className="top-full left-0 mt-1">
              Returns Pact Magic
            </HoverNote>
          </span>

          <span className="group/note relative inline-flex">
            <StepButton
              wide
              tone="emerald"
              onClick={() => rest("long")}
              disabled={aimed.length === 0}
              label={`Take a long rest ${whom}`}
            >
              Long rest
            </StepButton>

            <HoverNote className="top-full left-0 mt-1">
              Fills every bar and every spell slot
            </HoverNote>
          </span>
        </div>
      </section>

      <div aria-hidden="true" className={FADED_RULE_CLASSES} />

      <section aria-label="Experience">
        <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
          Experience
        </h3>

        {alone && (
          <div className="mt-2.5">
            <XpBar compact characterId={alone.id} name={alone.name} />
          </div>
        )}

        <div className="mt-2.5">
          <XpStepper
            campaignId={campaignId}
            targets={aimed}
            whom={whom}
            disabled={aimed.length === 0}
            onLevelled={onLevelled}
          />
        </div>
      </section>
    </div>
  );
}
