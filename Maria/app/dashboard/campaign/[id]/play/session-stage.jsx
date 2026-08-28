"use client";

import SettingsMark from "@/app/components/ui/settings-mark";
import { useRouteRefresh } from "@/app/components/use-route-refresh";

import RailTray from "./rail-tray";
import SessionSettingsDrawer from "./session-settings-drawer";

/**
 * The session itself, on the rail under the chest: what the party has earned,
 * and the two rests that put them back together.
 *
 * THE HEAD OF THE TABLE'S ALONE, as the chest above it is — a player reads their
 * own experience under the skills on the scores sheet. Both writers re-ask, so
 * this is a door rather than the lock.
 *
 * The socket's listeners are NOT here: experience has to move on every screen
 * whether or not this panel exists on it, so they sit in party-rail.jsx.
 */
export default function SessionStage({ campaignId, members }) {
  /* A RUNG MOVED ALSO REFRESHES THE ROUTE, where a figure does not: the scores
     sheet's panels are built in page.jsx, and every proficient skill on them is
     read off the proficiency bonus a level decides. The party rail says the same
     thing about an award — see the `level` listener there. */
  const refresh = useRouteRefresh();

  return (
    <RailTray
      mark={<SettingsMark className="size-12" />}
      markLabel="The session: rest and experience"
      title="Session"
      dialogLabel="Rest and experience"
    >
      {/* No fixed height, unlike the shelf above it: this panel is short, and
          the box morphing down to it is the whole point of the shared tray. */}
      <div className="px-5 pt-4 pb-5">
        <SessionSettingsDrawer
          campaignId={campaignId}
          members={members}
          onLevelled={refresh}
        />
      </div>
    </RailTray>
  );
}
