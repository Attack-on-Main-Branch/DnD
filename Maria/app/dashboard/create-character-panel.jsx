"use client";

import { useRouter } from "next/navigation";

import { PANEL_CLASSES, surfaceClasses } from "@/app/components/ui/surface";

import CreateCampaignPanel from "./create-campaign-panel";
import PlayerCharacterForm from "./player-character-form";

/**
 * The creation sheet, for whichever of the two things is being made. The role
 * is already in the URL when this mounts — `?new=player` from the roster's
 * empty slot, `?new=dm` from the campaign grid — so there is no role question
 * and no step behind these forms, only Cancel.
 *
 * Finishing calls `router.replace`: the sheet is spent, and on the third
 * character Back would reopen a form whose only outcome is "you already have 3".
 * Replacing drops it from history so Back skips straight past it.
 */
export default function CreateCharacterPanel({ role }) {
  const router = useRouter();
  const done = () => router.replace("/dashboard");

  return (
    <div
      className={surfaceClasses({
        glow: true,
        className: PANEL_CLASSES,
      })}
    >
      {role === "dm" ? (
        <CreateCampaignPanel onCreated={done} />
      ) : (
        <PlayerCharacterForm onCreated={done} />
      )}
    </div>
  );
}
