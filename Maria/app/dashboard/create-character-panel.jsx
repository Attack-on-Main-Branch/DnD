"use client";

import {
  NESTED_CARD_CLASSES,
  PANEL_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Button, { buttonClasses } from "@/app/components/ui/button";

import PlayerCharacterForm from "./player-character-form";

/**
 * The creation flow: pick a role first, then fill in the sheet for it. Rendered
 * by dashboard/page.jsx in place of the roster whenever `?new` is on the URL.
 *
 * It owns its own way out now. The two exits are not the same event and they
 * get different treatment:
 *
 * Cancel is a plain <Link>. Backing out leaves `?new` in history on purpose —
 * returning to a sheet you abandoned is what Back is for — and an anchor gets
 * that, plus middle-click and open-in-new-tab, for free.
 *
 * Finishing calls `router.replace`. That sheet is spent, and on the third
 * character it is a form with no slot left to fill: Back would reopen an empty
 * creation panel whose only possible outcome is "you already have 3".
 * Replacing drops it from history so Back skips straight past it.
 */
export default function CreateCharacterPanel() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  return (
    <div
      className={surfaceClasses({
        glow: true,
        className: PANEL_CLASSES,
      })}
    >
      {role === null && <RolePicker onPick={setRole} />}

      {role === "dm" && <DungeonMasterPanel onBack={() => setRole(null)} />}

      {role === "player" && (
        <PlayerCharacterForm
          onBack={() => setRole(null)}
          onCreated={() => router.replace("/dashboard")}
        />
      )}
    </div>
  );
}

function RolePicker({ onPick }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-wide">
          What are you joining as?
        </h3>
        <p className="mt-1 text-sm text-ink/60">
          This decides what the sheet asks you for.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <RoleCard
          title="Player"
          description="Roll up a character with a race, an alignment and a history."
          onClick={() => onPick("player")}
        />
        <RoleCard
          title="Dungeon Master"
          description="Run the world and the story."
          onClick={() => onPick("dm")}
        />
      </div>

      <div className="flex justify-end">
        {/*
          A link for the middle-click and new-tab behaviour a <button> cannot
          give, but `prefetch={false}`: Next prefetches links on viewport entry,
          so merely opening this sheet started fetching the page you just left.
          `/dashboard` is dynamic and `staleTimes.dynamic` is 0, so that payload
          could never be reused. Clicking still costs its one fetch.
        */}
        <Link
          href="/dashboard"
          prefetch={false}
          className={buttonClasses({ variant: "secondary" })}
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

function RoleCard({ title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-5 text-left transition duration-300 ${NESTED_CARD_CLASSES}`}
    >
      <span className="block font-display text-base font-semibold tracking-wide text-ink">
        {title}
      </span>
      <span className="mt-1 block text-xs text-ink/60">{description}</span>
    </button>
  );
}

/** Intentionally empty for now — the DM flow is not designed yet. */
function DungeonMasterPanel({ onBack }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-wide">
          Dungeon Master
        </h3>
        <p className="mt-1 text-sm text-ink/60">Nothing here yet.</p>
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
