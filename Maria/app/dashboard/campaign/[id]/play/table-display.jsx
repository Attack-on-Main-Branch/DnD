import ToastProvider from "@/app/components/ui/toast";
import { surfaceClasses } from "@/app/components/ui/surface";
import { diceColorHex } from "@/app/dashboard/character-presentation";

import ActivityLog from "./activity-log";
import CombatBackdrop from "./combat-backdrop";
import CombatSync from "./combat-sync";
import CombatTracker from "./combat-tracker";
import DiceBoard from "./dice-board";
import DiceTable, { RollAnnouncement } from "./dice-table";
import MapStage from "./map-stage";
import TableMaps from "./table-maps";
import TableState from "./table-state";
import TableTitle from "./table-title";
import TableWire from "./table-wire";
import TableDisplayPartySync from "./table-display-party-sync";

export default function TableDisplay({ campaignId, title, diceSkin, slices }) {
  const members = slices.party ?? [];
  const faces = members.map((member) => ({
    characterId: member.id,
    label: member.name,
    src: member.avatar_url,
    color: diceColorHex(member.dice_color),
    diceColor: member.dice_color,
  }));

  return (
    <main className="flex h-dvh flex-col gap-3 overflow-hidden p-3 lg:p-4">
      <ToastProvider>
        <TableWire campaignId={campaignId} display>
          <TableMaps
            campaignId={campaignId}
            maps={slices.maps ?? []}
            activeId={slices.activeMapId}
            worldUrl={slices.worldUrl}
          >
            <TableState seed={{ ...slices, members }}>
              <CombatBackdrop />
              <CombatSync campaignId={campaignId} />
              <TableDisplayPartySync campaignId={campaignId} faces={faces} />
              <TableTitle title={title} compact />
              <DiceTable campaignId={campaignId} diceSkin={diceSkin} display>
                <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,30dvh)] gap-3 lg:grid-cols-[clamp(11rem,15vw,20rem)_minmax(0,1fr)_clamp(11rem,15vw,20rem)] lg:grid-rows-[minmax(0,1fr)]">
                  <section
                    aria-label="Map"
                    className="col-span-2 row-start-1 flex min-h-0 min-w-0 items-center justify-center p-6 [container-type:size] lg:col-span-1 lg:col-start-2"
                  >
                    <MapStage
                      title={title}
                      campaignId={campaignId}
                      faces={faces}
                      display
                    >
                      <DiceBoard />
                    </MapStage>
                  </section>
                  <section
                    aria-label="Initiative"
                    className={surfaceClasses({
                      className:
                        "col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl lg:row-start-1",
                    })}
                  >
                    <CombatTracker
                      campaignId={campaignId}
                      faces={faces}
                      display
                    />
                  </section>
                  <div className="col-start-2 row-start-2 min-h-0 min-w-0 lg:col-start-3 lg:row-start-1">
                    <ActivityLog
                      campaignId={campaignId}
                      faces={faces}
                      className="h-full"
                      display
                    />
                  </div>
                </div>
                <RollAnnouncement />
              </DiceTable>
            </TableState>
          </TableMaps>
        </TableWire>
      </ToastProvider>
    </main>
  );
}
