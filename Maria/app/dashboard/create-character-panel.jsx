"use client";

import {
  NESTED_CARD_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";
import { useState } from "react";

import Button from "@/app/components/ui/button";

import PlayerCharacterForm from "./player-character-form";

/**
 * The creation flow: pick a role first, then fill in the sheet for it.
 * Rendered in place of the inventory grid, and hands control back through
 * `onClose` when the user is finished or backs all the way out.
 */
export default function CreateCharacterPanel({ onClose }) {
  const [role, setRole] = useState(null);

  return (
    <div
      className={surfaceClasses({
        glow: true,
        className: "rounded-2xl p-6 sm:p-8",
      })}
    >
      {role === null && <RolePicker onPick={setRole} onCancel={onClose} />}

      {role === "dm" && <DungeonMasterPanel onBack={() => setRole(null)} />}

      {role === "player" && (
        <PlayerCharacterForm onBack={() => setRole(null)} onCreated={onClose} />
      )}
    </div>
  );
}

function RolePicker({ onPick, onCancel }) {
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
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
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
