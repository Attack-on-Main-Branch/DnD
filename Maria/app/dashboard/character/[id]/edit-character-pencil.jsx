"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import PencilButton from "@/app/components/ui/pencil-button";

/**
 * Fetched when it is wanted, not when the page loads: the sheet holds the
 * creation form, and with it four hundred lines of races, archetypes and
 * alignments this page has no other reason to carry.
 *
 * `ssr: false` because there is nothing to prerender — an unopened <dialog>
 * renders nothing at all.
 */
const EditCharacterModal = dynamic(() => import("./edit-character-modal"), {
  ssr: false,
});

/**
 * The pen in the corner of the character sheet, and the sheet it opens.
 *
 * `opens` counts presses and does two jobs: nothing is in the tree until the
 * first, and it keys the modal so every press after mounts a fresh one. The
 * second is not bookkeeping — a CSS animation only plays when its element
 * arrives, so a <dialog> reopened in place appears at full size with no unfold.
 * Remounting also puts the fields back to what is stored, which is what Cancel
 * ought to mean.
 */
export default function EditCharacterPencil({ character }) {
  const [opens, setOpens] = useState(0);
  const [open, setOpen] = useState(false);

  // The chunk, on approach rather than on the press. `import()` is cached by
  // the module registry, so the `dynamic` above finds it already there and the
  // press opens something instead of going to fetch it.
  const prepare = useCallback(() => {
    import("./edit-character-modal");
  }, []);

  return (
    <>
      <PencilButton
        label={`Edit ${character.name}`}
        onPrepare={prepare}
        onClick={() => {
          setOpens((count) => count + 1);
          setOpen(true);
        }}
      />

      {opens > 0 && (
        <EditCharacterModal
          key={opens}
          character={character}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
