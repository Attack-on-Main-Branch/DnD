"use client";

import { useState } from "react";

import { addCharacterFeature } from "@/app/actions/features";
import { LABEL_CLASSES } from "@/app/components/ui/field-styles";
import SharedFeatureForm from "@/app/dashboard/feature-form";
import PartyPills from "@/app/dashboard/party-pills";

/**
 * The Dungeon Master writing a feature onto somebody. The two boxes are the
 * sheet's own — see dashboard/feature-form.jsx — and what this adds is the one
 * question the sheet never has to ask: which character.
 *
 * ONE NAME AND NOT SEVERAL. A feat is granted to a person; "the whole party
 * gains Lucky" is four separate grants and reads as one undo away from being
 * wrong. So this is a single-select, and `PartyPills` itself rather than a row
 * that merely resembled it — the same capsule the scores drawer and the pack
 * aim with, so one gesture looks like itself everywhere it appears.
 *
 * A CHOICE AND NOT A PERMISSION: the INSERT policy re-asks whether this account
 * runs a table the character plays at, so an id arriving from here decides
 * nothing.
 */
export default function CampaignFeatureForm({ members, onWritten }) {
  const [target, setTarget] = useState(() => members[0]?.id ?? null);

  const chosen = members.find((one) => one.id === target) ?? null;

  async function write({ name, description }) {
    if (!chosen) {
      return true;
    }

    const result = await addCharacterFeature(chosen.id, {
      name,
      description,
    }).catch(() => null);

    // Truthy is "refused", which is what keeps the words in the boxes.
    if (!result || result.kind === "rejected") {
      onWritten(null, result?.message ?? "That did not reach the table.");
      return true;
    }

    onWritten(result.feature, null);
    return false;
  }

  if (members.length === 0) {
    return (
      <p className="mt-4 text-xs text-ink/50 italic">
        Nobody has joined this party yet. A feature is granted to somebody.
      </p>
    );
  }

  return (
    <SharedFeatureForm onWrite={write} disabled={!chosen}>
      <fieldset className="min-w-0">
        <legend className={LABEL_CLASSES}>Who it is for</legend>

        <div className="mt-1.5">
          <PartyPills
            members={members}
            chosen={target}
            onChoose={setTarget}
            label="Who it is for"
          />
        </div>
      </fieldset>
    </SharedFeatureForm>
  );
}
