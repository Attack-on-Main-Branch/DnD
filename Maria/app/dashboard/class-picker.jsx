"use client";

import { ARCHETYPES, archetypeDetails } from "sina/rules/character";

import {
  CHOICE_CARD_FOCUS_CLASSES,
  INVALID_GROUP_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import SelectionDot from "@/app/components/ui/selection-dot";
import { NESTED_CARD_CLASSES } from "@/app/components/ui/surface";

import { archetypeEmblem, withAlpha } from "./character-presentation";

/** Stagger between path cards as the tray opens. */
const RISE_STEP_MS = 65;
const RISE_DELAY_MS = 60;

/**
 * Class in two steps: archetype first, then the path within it, so thirteen
 * classes become five and then two or three.
 *
 * Both halves are real radio inputs inside labels rather than `role="radio"`
 * divs — a native group gives arrow-key movement, the group name and the
 * checked state for free, where `tabindex="0"` cards make five tab stops out of
 * one choice. The accent colours tint only the emblem and the chosen card's
 * wash; every rim, glow and label stays gold.
 */
export default function ClassPicker({
  archetype,
  classId,
  onChange,
  disabled,
  invalidField,
}) {
  const selected = archetypeDetails(archetype);

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className={LABEL_CLASSES}>Class</legend>

      <div
        className={`mt-1.5 grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3 ${
          invalidField === "archetype"
            ? `rounded-xl ${INVALID_GROUP_CLASSES}`
            : ""
        }`}
      >
        {ARCHETYPES.map((entry) => {
          const isSelected = archetype === entry.id;
          // Once something is chosen, the others step back — but only their
          // emblems do. Fading the whole card multiplies its opacity into text
          // that is already alpha-reduced against the fill, which took the
          // blurb down to about 2.1:1 on four live controls. Quieting the
          // colour reads as "not this one" without touching the words.
          const dimmed = Boolean(selected) && !isSelected;
          const { accent, clip } = archetypeEmblem(entry.id);

          return (
            <label
              key={entry.id}
              className={`group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border p-4 text-center transition duration-300 select-none ${CHOICE_CARD_FOCUS_CLASSES} motion-safe:hover:-translate-y-0.5 ${
                isSelected ? "border-gold/55" : NESTED_CARD_CLASSES
              }`}
              // Only the chosen card paints inline, and only because its wash
              // carries the archetype's own accent. The resting state is all
              // classes now: an inline `background` outranks every utility,
              // which is exactly why the unselected card used to wear a
              // top-to-bottom gradient that no hover could reach and no other
              // card in the sheet had.
              style={{
                background: isSelected
                  ? `linear-gradient(180deg, ${withAlpha(accent, 0.13)}, rgba(0,0,0,0.3))`
                  : undefined,
                boxShadow: isSelected
                  ? `inset 0 0 0 1px rgba(255,223,156,0.16), 0 24px 58px -34px ${withAlpha(accent, 0.9)}`
                  : undefined,
              }}
            >
              <input
                type="radio"
                name="archetype"
                value={entry.id}
                checked={isSelected}
                // Changing archetype clears the path: the old one belongs to a
                // different list, and leaving it set would submit a pair the
                // database rejects.
                onChange={() => onChange({ archetype: entry.id, classId: "" })}
                className="sr-only"
              />

              <span
                aria-hidden="true"
                className={`grid size-16 place-items-center rounded-full border border-gold/15 transition duration-300 ${
                  isSelected ? "" : "bg-white/5"
                } ${dimmed ? "opacity-40 group-hover:opacity-100" : ""}`}
                // Flat while unselected, for the same reason as the card: a
                // radial fade inside an otherwise flat tile is the thing that
                // made these read as a different material.
                style={{
                  background: isSelected
                    ? `radial-gradient(circle at 50% 50%, ${withAlpha(accent, 0.28)}, transparent 72%)`
                    : undefined,
                }}
              >
                <span
                  // Out to the disc's inner edge rather than a small mark
                  // floating in the middle of it. The ring is 64px and this is
                  // 40, which leaves the border visibly clear on every shape —
                  // including the diamond and the triangle, whose corners reach
                  // further than a circle of the same box would.
                  className="size-7 transition duration-300"
                  style={{
                    background: accent,
                    clipPath: clip,
                    filter: `drop-shadow(0 0 ${isSelected ? 15 : 6}px ${withAlpha(
                      accent,
                      isSelected ? 0.7 : 0.28,
                    )})`,
                    opacity: isSelected ? 1 : 0.72,
                  }}
                />
              </span>

              <span
                className={`font-display text-lg font-semibold tracking-wide transition-colors duration-300 ${
                  isSelected ? "text-gold" : "text-ink"
                }`}
              >
                {entry.name}
              </span>

              {/*
                Three lines' worth of room whether the blurb needs it or not.
                The cards already stretch to a common height — grid does that —
                but the line below them did not line up: the Priest's blurb runs
                to three lines and everyone else's to two, so its path count sat
                a line lower than the other four. Reserving the taller of the
                two heights is what levels them.

                `4.875em` is 3 × `leading-relaxed`, in the blurb's own font
                size, so it follows the type rather than pinning a pixel value
                that would be wrong the moment the size changed.
              */}
              <span className="min-h-[4.875em] text-xs leading-relaxed text-pretty text-ink/50">
                {entry.blurb}
              </span>

              <span
                className={`font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-300 ${
                  isSelected ? "text-gold/75" : "text-ink/60"
                }`}
              >
                {entry.paths.length === 1
                  ? "1 path"
                  : `${entry.paths.length} paths`}
              </span>

              {isSelected && (
                /*
                  A hand-picked near-black, one step LIGHTER than
                  `--color-surface`, and so not derivable by compositing: every
                  layer the card puts down darkens. Matched by eye against the
                  glass panel as it renders, backdrop-filter and all. It cannot
                  track the accent either — the arrow hangs off the bottom of
                  the card, where the accent has already faded out.
                */
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-r border-b border-gold/55 bg-[#17110b]"
                />
              )}
            </label>
          );
        })}
      </div>

      {!selected && (
        <p className="mt-3.5 rounded-lg border border-dashed border-gold/15 p-4 text-center font-mono text-xs tracking-[0.16em] text-ink/60 uppercase">
          Select an archetype to reveal its paths
        </p>
      )}

      {/*
        The reveal animates `grid-template-rows` from 0fr to 1fr rather than a
        height, which is what lets it open to whatever the content happens to
        measure without anyone hard-coding a pixel value. The inner element
        needs both `overflow-hidden` and `min-h-0`: a grid item's automatic
        minimum size is its content, so without the floor it refuses to be
        squashed and the tray never closes.
      */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-tray motion-reduce:transition-none ${
          selected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-5">
            <div className={`${LABEL_CLASSES} mb-2.5`}>Path</div>

            {/*
              Three fixed columns rather than `auto-fit`, which sized the cards
              by how many paths an archetype happened to have — a Warrior's
              three came out narrower than an Assassin's two, and neither
              matched the ability or alignment cards below. Fixed, an archetype
              with two paths leaves the third cell empty and every card on the
              sheet is one size.
            */}
            <div
              className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${
                invalidField === "classId"
                  ? `rounded-lg ${INVALID_GROUP_CLASSES}`
                  : ""
              }`}
            >
              {(selected?.paths ?? []).map((path, index) => {
                const isSelected = path.id === classId;
                const accent = archetypeEmblem(selected.id).accent;

                return (
                  <label
                    // Path ids are unique across the whole catalogue, so
                    // switching archetype changes every key and the cards
                    // remount — which is what replays the stagger below.
                    key={path.id}
                    className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition duration-300 select-none ${CHOICE_CARD_FOCUS_CLASSES} motion-safe:animate-[rise_0.42s_var(--ease-tray)_both] ${
                      isSelected ? "border-gold/55" : NESTED_CARD_CLASSES
                    }`}
                    style={{
                      animationDelay: `${RISE_DELAY_MS + index * RISE_STEP_MS}ms`,
                      background: isSelected
                        ? `linear-gradient(180deg, ${withAlpha(accent, 0.12)}, rgba(0,0,0,0.26))`
                        : undefined,
                      boxShadow: isSelected
                        ? `inset 0 0 0 1px rgba(255,223,156,0.14), 0 18px 44px -32px ${withAlpha(accent, 0.9)}`
                        : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="classId"
                      value={path.id}
                      checked={isSelected}
                      onChange={() =>
                        onChange({ archetype: selected.id, classId: path.id })
                      }
                      className="sr-only"
                    />

                    <span className="flex items-start justify-between gap-3">
                      <span
                        className={`font-display text-base font-semibold tracking-wide transition-colors duration-300 ${
                          isSelected ? "text-gold" : "text-ink"
                        }`}
                      >
                        {path.name}
                      </span>
                      <SelectionDot selected={isSelected} />
                    </span>

                    <span className="text-xs leading-relaxed text-pretty text-ink/50">
                      {path.blurb}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
