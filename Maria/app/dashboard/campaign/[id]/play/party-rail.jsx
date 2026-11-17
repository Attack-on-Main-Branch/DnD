"use client";

import PartyCard from "./party-card";
import DiceCapsule from "./dice-capsule";
import { useTableWire } from "./table-wire";
import { usePartySync } from "./use-party-sync";
import WorkspacePartyBanners from "./workspace-party-banners";

export default function PartyRail({
  campaignId,
  members,
  isDungeonMaster = false,
  seatCharacterId = null,
  seatTitle = null,
  workspace = false,
}) {
  const { seated } = useTableWire();
  usePartySync({ campaignId, members, seatCharacterId });

  if (members.length === 0) {
    return (
      <div
        data-table-arrival-content={workspace ? "right" : undefined}
        className="w-full"
      >
        <p className="text-center text-sm text-ink/50 italic lg:text-left">
          Nobody has joined this party yet.
        </p>
      </div>
    );
  }

  const cards = members.map((member, index) => (
    <PartyCard
      key={member.id}
      campaignId={campaignId}
      member={member}
      index={index}
      count={members.length}
      here={seated.has(member.id)}
      // The head of the table reads the whole party's bars, a player
      // their own alone.
      showsHealth={isDungeonMaster || member.id === seatCharacterId}
      canEdit={isDungeonMaster || member.id === seatCharacterId}
      // The seat, not the deed — see inspiration-pips.jsx for why the
      // database cannot draw this line on its own.
      showsInspiration={isDungeonMaster || member.id === seatCharacterId}
      // And the shield, on the same line and for the same reason: an
      // account holding two characters at this table is handed both their
      // armour classes by `campaign_party`, because "owner" there is the
      // ACCOUNT. Which of them is sitting down is the seat's question.
      showsArmor={isDungeonMaster || member.id === seatCharacterId}
      isDungeonMaster={isDungeonMaster}
      seatCharacterId={seatCharacterId}
      // Only ever read back to the person who pressed, on the line the
      // panel shows while the write is out. The name the log KEEPS is
      // derived in the database from the row.
      actorName={seatTitle}
      workspace={workspace}
    />
  ));

  return workspace ? (
    <WorkspacePartyBanners>
      {cards.map((card, index) => (
        <li key={card.key} className="workspace-banner-slot">
          {card}
          <DiceCapsule characterId={members[index].id} workspace="banner" />
        </li>
      ))}
    </WorkspacePartyBanners>
  ) : (
    <div className="w-full">
      <ul className="flex w-full flex-col gap-3">{cards}</ul>
    </div>
  );
}
