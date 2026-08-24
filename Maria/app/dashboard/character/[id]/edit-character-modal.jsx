"use client";

import { useState } from "react";

import EditModal from "@/app/components/ui/edit-modal";
import PlayerCharacterForm from "@/app/dashboard/player-character-form";

import { characterHandle } from "sina/rules/character";

/**
 * The character sheet, opened over itself. The form inside is the creation
 * sheet's own component rather than a copy, so the two are one object filled in
 * differently, pre-filled off the row this page already loaded.
 *
 * Its own module because it is loaded on demand — see edit-character-pencil.jsx.
 */
export default function EditCharacterModal({ character, open, onClose }) {
  const [busy, setBusy] = useState(false);

  return (
    <EditModal
      open={open}
      title={`Edit ${characterHandle(character)}`}
      busy={busy}
      onClose={onClose}
    >
      <PlayerCharacterForm
        character={character}
        onPending={setBusy}
        onDone={onClose}
        onCancel={onClose}
      />
    </EditModal>
  );
}
