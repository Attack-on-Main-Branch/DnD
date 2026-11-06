"use client";

import { useCallback } from "react";
import { parseArmorClass } from "sina/rules/death";
import { readConditions } from "sina/rules/conditions";
import { readFeatures } from "sina/rules/features";
import { parseHitPoints } from "sina/rules/health";
import { parseInspiration } from "sina/rules/inspiration";
import { parseLevel } from "sina/rules/level";
import { parseXp } from "sina/rules/xp";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import { useRouteRefresh } from "@/app/components/use-route-refresh";

import { useTableStore } from "./table-state";
import { useWireMessage } from "./table-wire";
import { useTableDeed } from "./use-table-deed";

export function usePartySync({ campaignId, members, seatCharacterId }) {
  const store = useTableStore();
  const { resync } = useTableDeed(campaignId);

  /* The whole route, and only for the two things that actually change it. */
  const refresh = useRouteRefresh();

  useWireMessage("seat", (message) => {
    if (typeof message.characterId !== "string") {
      return;
    }

    if (members.some((member) => member.id === message.characterId)) {
      return;
    }

    refresh();
  });

  /* A FEATURE WRITTEN SOMEWHERE THIS TABLE CANNOT HEAR: the sheet's own tab,
     or the Dungeon Master's Create tab, both of which are other routes with no
     socket of their own. `character_features` is on the publication for exactly
     this — the payload is discarded and the change is answered by re-reading,
     the rule `useLiveRefresh` is written under. */
  useLiveRefresh({
    channel: `features:${campaignId}`,
    table: "character_features",
    onChange: useCallback(
      () =>
        resync({
          features: true,
          characterIds: members.map((member) => member.id),
        }),
      [members, resync],
    ),
  });

  useLiveRefresh({
    channel: `party:${campaignId}`,
    table: "campaign_members",
    // Bandwidth, not security — the SELECT policies are what decide what may be
    // delivered at all, and they hand a player only their own membership.
    filter: `campaign_id=eq.${campaignId}`,
    onChange: refresh,
  });

  useLiveRefresh({
    channel: `health:${campaignId}`,
    table: "characters",
    onChange: useCallback(() => resync({ party: true }), [resync]),
  });

  const refreshHealth = (message) => {
    if (members.some((member) => member.id === message.characterId)) {
      resync({ party: true });
    }
  };
  useWireMessage("health", refreshHealth);
  useWireMessage("condition", refreshHealth);

  /* ONE FEATURE, EITHER WAY. A name and a description are TEXT off the socket,
     which nothing else at this table takes — so it goes through the rules layer
     that bound the sender's own write, and into a slot this rail was seeded
     with. A struck-out one carries an id alone. */
  useWireMessage("feature", (message) => {
    if (message.gone) {
      store.dropFeature(message.characterId, message.featureId);
      return;
    }

    const [read] = readFeatures([message.feature]);

    if (read) {
      store.addFeature(message.characterId, {
        ...read,
        character_id: message.characterId,
      });
    }
  });

  /* WHAT SOMEBODY IS UNDER. A list of keys off the socket, put through the
     catalogue that bound the sender's own write — `readConditions` drops
     anything it does not know — and into a slot this rail was seeded with. */
  useWireMessage("conditions", (message) => {
    for (const [characterId, held] of Object.entries(
      message.byCharacter ?? {},
    )) {
      store.setConditions(characterId, readConditions(held));
    }
  });

  /* A hit die spent. The bar it turned into arrives as its own `condition`
     message — `spend_hit_die` heals through `apply_heal` — so this carries the
     tally alone. `parseHitPoints` bounds it: a pool is never longer than a
     level, and `hitDicePool` holds it inside one when it is read. */
  useWireMessage("hitdice", (message) => {
    store.setHitDice(message.characterId, parseHitPoints(message.spent));
  });

  /* The shield. Nothing else follows from it, so it needs no refresh — and a
     card this viewer may not read one for was seeded with null, which
     `setArmor` will not write into. */
  useWireMessage("armor", (message) => {
    store.setArmor(message.characterId, parseArmorClass(message.armorClass));
  });

  /* A SCORE THE HEAD OF THE TABLE SET. Same reasoning as the level below and
     rarer still — see ability-score-field.jsx. The message carries no number,
     only the news that there is one to go and read. */
  useWireMessage("sheet", refresh);

  /* A LEVEL ALSO REFRESHES THE ROUTE, where a hit point does not: the ability
     sheet's panels are built in page.jsx, and every proficient skill on them is
     read off the proficiency bonus a level decides. An award is a handful of
     presses a session. */
  useWireMessage("level", (message) => {
    const level = parseLevel(message.level);

    if (level === null) {
      return;
    }

    store.setLevel(message.characterId, level);
    refresh();
  });

  /* Experience, and the rung it may have carried them to. Same rails: both
     numbers go through the rules that bound the sender's own write, and the id
     only ever picks out a card this rail already has from the server. A level
     that MOVED refreshes for the reason above, whichever way it went. */
  useWireMessage("xp", (message) => {
    const level = parseLevel(message.level);
    const xp = parseXp(message.xp);

    if (level === null || xp === null) {
      return;
    }

    const moved = level !== store.read().levels[message.characterId];

    store.setXp(message.characterId, xp, level);

    resync({ party: true });

    if (moved) {
      refresh();
    }
  });

  /* One mark. `setInspiration` writes to no card this rail was not seeded a
     figure for, so a player cannot be told somebody else's. */
  useWireMessage("inspiration", (message) => {
    store.setInspiration(
      message.characterId,
      parseInspiration(message.inspiration),
    );
  });

  /* A DOORBELL AND NOT A NUMBER. A rest moves a bar and as many as nine pips
     across up to six characters, and none of that has been through a `select()`
     list — so the other chairs are told that it happened and go and read it. */
  useWireMessage("rest", () => {
    resync({ party: true, sheets: true, seatCharacterId });
  });
}
