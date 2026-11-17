import Link from "next/link";

import { campaignDisplayPath } from "@/lib/routes";

import ActivityLog from "./activity-log";
import CombatStage from "./combat-stage";
import CombatTracker from "./combat-tracker";
import DiceCapsule from "./dice-capsule";
import DiceRail from "./dice-rail";
import LeaveTable from "./leave-table";
import MapStage from "./map-stage";
import PartyRail from "./party-rail";
import TableWorkspace from "./table-workspace";

export default function DesktopTable({
  campaign,
  seat,
  isDungeonMaster,
  faces,
  mapSeat,
  members,
  carriers,
  tools,
  dmTools,
  wayOut,
}) {
  return (
    <TableWorkspace
      title={campaign.title}
      exit={
        <LeaveTable
          href={wayOut}
          className="workspace-text-button whitespace-nowrap"
        />
      }
      cast={
        isDungeonMaster && (
          <Link
            key="cast"
            href={campaignDisplayPath(campaign.id)}
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
            className="workspace-header-button whitespace-nowrap"
          >
            Cast to TV ↗
          </Link>
        )
      }
      dice={
        seat && (
          <DiceRail key="dice" canKeepSecrets={isDungeonMaster} workspace />
        )
      }
      party={
        <PartyRail
          campaignId={campaign.id}
          members={members}
          isDungeonMaster={isDungeonMaster}
          seatCharacterId={seat?.characterId}
          seatTitle={seat?.title}
          workspace
        />
      }
      initiative={
        !isDungeonMaster && (
          <CombatTracker
            key="initiative"
            campaignId={campaign.id}
            faces={faces}
            seatCharacterId={seat?.characterId}
          />
        )
      }
      mapRoll={<DiceCapsule key="map-roll" workspace="map" />}
      activity={
        <ActivityLog
          key="activity"
          campaignId={campaign.id}
          faces={faces}
          workspace
        />
      }
      boardTools={
        isDungeonMaster && (
          <CombatStage
            campaignId={campaign.id}
            faces={faces}
            members={carriers}
          />
        )
      }
      tools={
        <>
          {tools && (
            <>
              {isDungeonMaster && (
                <p className="workspace-navigation-label">Party</p>
              )}
              {tools.scores}
              {tools.pack}
              {tools.spells}
              {tools.notes}
              {tools.lore}
            </>
          )}
          {dmTools && (
            <>
              <p className="workspace-navigation-label">DM</p>
              {dmTools}
            </>
          )}
        </>
      }
    >
      <MapStage
        key="map"
        url={campaign.map_url}
        title={campaign.title}
        campaignId={campaign.id}
        faces={faces}
        seat={mapSeat}
        canSweep={isDungeonMaster}
        canRule={isDungeonMaster}
      />
    </TableWorkspace>
  );
}
