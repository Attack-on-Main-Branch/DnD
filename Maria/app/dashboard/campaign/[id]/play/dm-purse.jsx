import { COIN_TYPES, emptyPurse } from "sina/rules/currency";

import CoinPurse from "./coin-purse";

export default function DmPurse({
  campaignId,
  character,
  members,
  actorName,
  purse,
  purses,
}) {
  const totals = emptyPurse();

  if (!character) {
    for (const member of members) {
      const balance = purses.get(member.id);
      for (const coin of COIN_TYPES) totals[coin] += balance?.[coin] ?? 0;
    }
  }

  return (
    <CoinPurse
      key={character?.id ?? "party"}
      dm
      campaignId={campaignId}
      characterId={character?.id}
      characterName={character?.name}
      actorName={actorName}
      purse={character ? purse : totals}
      party={
        character ? members.filter((member) => member.id !== character.id) : []
      }
      targets={character ? [character] : members}
      purses={purses}
    />
  );
}
