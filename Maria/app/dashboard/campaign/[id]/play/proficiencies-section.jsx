"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  MAX_PROFICIENCY_LENGTH,
  readProficiencyName,
} from "sina/rules/character-stats";
import {
  changeProficiency,
  readProficiencies,
} from "@/app/actions/table-adjustments";
import FormAlert from "@/app/components/ui/form-alert";
import {
  startNavigationProgress,
  stopNavigationProgress,
} from "@/app/components/navigation-progress-control";
import { surfaceClasses } from "@/app/components/ui/surface";
import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import { useTableWire, useWireMessage } from "./table-wire";

/**
 * What a path is trained to wear, hold and use, as two lists of pills.
 *
 * ARMOUR IS ITS OWN LIST because a Wizard's answer is "none" and that is worth a
 * pill of its own rather than an empty row — knowing somebody has no armour
 * proficiency is exactly as useful as knowing they have three.
 *
 * The weapons and the tools share a row: a table asks "what can they swing",
 * and thieves' tools are an answer to that in the same breath as a rapier.
 *
 * No `"use client"` and no hooks. Nothing here moves without a route render —
 * the path decides it — so this renders on the server and the drawer around it
 * holds the numbers that do.
 */
const PILL_CLASSES =
  "inline-flex items-center rounded-full border px-2 py-0.5 " +
  "font-mono text-[0.625rem] tracking-[0.12em] uppercase";

export default function ProficienciesSection({
  proficiencies,
  campaignId,
  characterId,
  canEdit,
}) {
  const [standing, setStanding] = useState(proficiencies);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();
  const revision = useRef(0);
  const saving = useRef(false);
  const { send } = useTableWire();

  const refresh = useCallback(async () => {
    if (!canEdit) return;
    const run = ++revision.current;
    const result = await readProficiencies(campaignId, characterId).catch(
      () => null,
    );
    if (run === revision.current && result?.kind === "success")
      setStanding(result.proficiencies);
  }, [campaignId, characterId, canEdit]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useLiveRefresh({
    channel: `proficiencies:${characterId}`,
    table: "characters",
    filter: `id=eq.${characterId}`,
    onChange: refresh,
  });
  useWireMessage("proficiencies", (message) => {
    if (message.characterId === characterId) refresh();
  });

  function change(category, value, remove) {
    if (!canEdit || pending || saving.current) return;
    const name = readProficiencyName(value);
    if (!name) return;
    saving.current = true;
    ++revision.current;
    setError(null);
    startNavigationProgress();
    startTransition(async () => {
      const result = await changeProficiency(
        campaignId,
        characterId,
        category,
        name,
        remove,
      ).catch(() => null);
      saving.current = false;
      stopNavigationProgress();
      if (result?.kind !== "success") {
        setError(
          result?.message ?? "Could not save that proficiency. Try again.",
        );
        return;
      }
      ++revision.current;
      setStanding(result.proficiencies);
      if (!remove) setDrafts((current) => ({ ...current, [category]: "" }));
      send({ kind: "proficiencies", characterId });
    });
  }

  return (
    <section
      aria-label="Proficiencies"
      className={surfaceClasses({
        variant: "plain",
        className: "flex flex-col gap-2.5 rounded-xl p-3",
      })}
    >
      {Object.entries(GROUPS).map(([key, label]) => (
        <div key={key}>
          <p className="font-mono text-[9px] tracking-[0.16em] text-ink/45 uppercase">
            {label}
            {key === "armor" && standing.qualifier?.armor && (
              <span className="ml-1.5 text-ink/35 normal-case">
                ({standing.qualifier.armor})
              </span>
            )}
          </p>
          <ul className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {standing[key].length === 0 ? (
              <li>
                <span
                  className={`${PILL} border-ink/20 bg-black/30 text-ink/45`}
                >
                  {key === "armor" ? "No Armor" : "None"}
                </span>
              </li>
            ) : (
              standing[key].map((one) => (
                <li
                  key={one}
                  className={`${PILL} ${key === "armor" ? "border-slate-400/30 bg-slate-400/10 text-slate-200/90" : "border-gold/25 bg-gold/10 text-gold/85"}`}
                >
                  {one}
                  {canEdit && (
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Remove ${one} proficiency`}
                      onClick={() => change(key, one, true)}
                      className="grid size-5 cursor-pointer place-items-center rounded-full text-base leading-none text-ink/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-35"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))
            )}
            {canEdit && (
              <li className="max-w-full">
                <input
                  aria-label={`New ${label.toLowerCase()} proficiency`}
                  placeholder="+ Add"
                  value={drafts[key] ?? ""}
                  maxLength={MAX_PROFICIENCY_LENGTH}
                  readOnly={pending}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  onBlur={(event) => change(key, event.target.value, false)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      change(key, event.currentTarget.value, false);
                    }
                  }}
                  className={`${PILL} h-6.5 max-w-full border-dashed border-gold/35 bg-transparent text-gold/85 outline-none placeholder:text-ink/40 hover:border-gold/60 focus:border-gold`}
                  style={{
                    width: `${Math.max(10, (drafts[key]?.length ?? 0) + 3)}ch`,
                  }}
                />
              </li>
            )}
          </ul>
        </div>
      ))}
      <FormAlert>{error}</FormAlert>
    </section>
  );
}

function Group({ label, note, children }) {
  return (
    <div>
      <p className="font-mono text-[0.5625rem] tracking-[0.16em] text-ink/45 uppercase">
        {label}
        {note && (
          <span className="ml-1.5 text-ink/35 normal-case">({note})</span>
        )}
      </p>

      <ul className="mt-1.5 flex flex-wrap gap-1.5">{children}</ul>
    </div>
  );
}
