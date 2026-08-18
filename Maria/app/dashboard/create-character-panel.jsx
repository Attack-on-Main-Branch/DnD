"use client";

import { useRouter } from "next/navigation";

import { PANEL_CLASSES, surfaceClasses } from "@/app/components/ui/surface";

import CreateCampaignPanel from "./create-campaign-panel";
import PlayerCharacterForm from "./player-character-form";

/**
 * The creation sheet, for whichever of the two things is being made.
 *
 * There used to be a role question in front of this — "What are you joining
 * as?" — and it is gone because nothing arrives here without having answered
 * it. The roster's empty slot links to `?new=player` and the campaign grid's to
 * `?new=dm`, so the role is in the URL before the panel mounts. Asking again
 * was a step whose answer was already on screen when it was clicked.
 *
 * That is also why neither form has a Back button any more: there is no step
 * behind them. They have Cancel, which is a link to the dashboard.
 *
 * Finishing calls `router.replace`. That sheet is spent, and on the third
 * character it is a form with no slot left to fill: Back would reopen an empty
 * creation panel whose only possible outcome is "you already have 3".
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
