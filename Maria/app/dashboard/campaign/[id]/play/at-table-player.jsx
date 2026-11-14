"use client";

import { useEffect, useId, useRef, useState } from "react";

import AbilityPillars from "@/app/components/ui/ability-pillars";
import Button from "@/app/components/ui/button";
import SpellSigil from "@/app/components/ui/spell-sigil";
import TravellingPack from "@/app/components/ui/travelling-pack";
import { surfaceClasses } from "@/app/components/ui/surface";

import CombatTracker from "./combat-tracker";
import DiceBoard from "./dice-board";
import DiceCapsule from "./dice-capsule";
import { holdTray } from "./dice-engine";
import DiceRail from "./dice-rail";
import InventoryPack from "./inventory-pack";
import LeaveTable from "./leave-table";
import NotesScroll from "./notes-scroll";
import PartyCard from "./party-card";
import SpellBook from "./spell-book";
import TableMap from "./table-map";
import TableTitle from "./table-title";
import { useTableMaps } from "./table-maps";
import { usePartySync } from "./use-party-sync";
import WorldLore from "./world-lore";

const PANES = [
  { value: "sheet", label: "Sheet", icon: AbilityPillars },
  { value: "spells", label: "Spells", icon: SpellSigil },
  { value: "pack", label: "Pack", icon: TravellingPack },
];

export default function AtTablePlayer({
  campaignId,
  title,
  lore,
  worldMap,
  seat,
  members,
  carriers,
  faces,
  casters,
  panels,
  wayOut,
}) {
  const [drawer, setDrawer] = useState({ pane: "sheet", open: false });
  const panelId = useId();
  const trigger = useRef(null);
  const closeButton = useRef(null);
  const contents = useRef(null);
  const { activeId, activeUrl } = useTableMaps();
  const member = members.find((one) => one.id === seat.characterId);
  const pane = PANES.find(({ value }) => value === drawer.pane) ?? PANES[0];

  usePartySync({ campaignId, members, seatCharacterId: seat.characterId });

  useEffect(() => {
    if (!activeUrl) holdTray(1, 1);
  }, [activeUrl]);

  useEffect(() => {
    if (drawer.open) {
      contents.current.scrollTop = 0;
      closeButton.current?.focus({ preventScroll: true });
    }
  }, [drawer.open, drawer.pane]);

  function close() {
    setDrawer((standing) => ({ ...standing, open: false }));
    trigger.current?.focus({ preventScroll: true });
  }

  function choose(event, pane) {
    if (drawer.open && drawer.pane === pane) {
      close();
    } else {
      trigger.current = event.currentTarget;
      setDrawer({ pane, open: true });
    }
  }

  return (
    <div
      className="fixed inset-0 mx-auto flex w-full min-w-0 max-w-3xl flex-col [--phone-nav-height:calc(3.25rem+env(safe-area-inset-bottom))]"
      onKeyDown={(event) => {
        if (
          drawer.open &&
          event.key === "Escape" &&
          !event.target.closest("dialog")
        ) {
          event.preventDefault();
          close();
        }
      }}
    >
      <div
        inert={drawer.open || undefined}
        className="isolate flex min-h-0 min-w-0 flex-1 flex-col gap-2 px-2 pt-[max(0.25rem,env(safe-area-inset-top))] pb-1"
      >
        <header className="grid grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center gap-1">
          <LeaveTable
            href={wayOut}
            slide="up"
            className="inline-flex min-h-11 items-center justify-self-start text-xs whitespace-nowrap text-ink/65 hover:text-gold"
          />
          <TableTitle compact title={title} />
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-2 landscape:grid landscape:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] landscape:grid-rows-[minmax(0,1fr)_auto]">
          <div
            data-table-arrival-content
            className="flex min-w-0 flex-col gap-1.5 landscape:min-h-0 landscape:overflow-y-auto"
          >
            {member && (
              <div className="relative">
                <ul aria-label="Your character">
                  <PartyCard
                    phone
                    campaignId={campaignId}
                    member={member}
                    here
                    showsHealth
                    showsInspiration
                    showsArmor
                    canEdit
                    seatCharacterId={seat.characterId}
                    actorName={seat.title}
                  />
                </ul>
                <DiceCapsule
                  characterId={seat.characterId}
                  workspace="map"
                  className="top-auto! bottom-2"
                />
              </div>
            )}
            <section
              aria-label="Dice"
              className={surfaceClasses({
                className: "rounded-xl px-1 py-0.5",
              })}
            >
              <DiceRail phone canKeepSecrets={false} />
            </section>
          </div>
          <section
            aria-label="Play area"
            data-table-arrival-map
            className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] justify-items-center gap-1 landscape:col-start-2 landscape:row-span-2"
          >
            {activeUrl ? (
              <TableMap
                key={`${activeId ?? ""}:${activeUrl}`}
                phone
                url={activeUrl}
                title={title}
                campaignId={campaignId}
                faces={faces}
                seat={seat}
                canSweep={false}
                heightClass="max-h-[100cqh]"
                className="max-w-full"
              />
            ) : (
              <div className="col-start-1 row-start-1 grid min-h-0 w-full place-items-center p-1.5 [container-type:size]">
                <div className="relative grid aspect-square w-[min(100cqw,100cqh)] place-items-center">
                  <p className="p-4 text-center text-sm text-ink/65">
                    No map for this campaign.
                  </p>
                  <DiceBoard phone />
                </div>
              </div>
            )}
            <DiceCapsule workspace="map" />
          </section>
          <div
            data-table-arrival-content
            className="flex max-h-[25dvh] min-h-0 shrink-0 flex-col overflow-hidden rounded-lg border border-gold/20 empty:hidden landscape:col-start-1 landscape:row-start-2"
          >
            <CombatTracker
              campaignId={campaignId}
              faces={faces}
              seatCharacterId={seat.characterId}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Dismiss panel"
        tabIndex={-1}
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-30 touch-none bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${drawer.open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <section
        id={panelId}
        aria-label={pane.label}
        inert={!drawer.open || undefined}
        aria-hidden={!drawer.open || undefined}
        className={surfaceClasses({
          variant: "solid",
          className: `fixed bottom-[var(--phone-nav-height)] left-1/2 z-40 flex max-h-[calc(100dvh-var(--phone-nav-height)-1rem)] w-full max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-t-2xl transition-[translate,visibility] duration-300 ease-tray motion-reduce:transition-none ${drawer.open ? "visible translate-y-0" : "invisible translate-y-[calc(100%+var(--phone-nav-height))]"}`,
        })}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gold/20 px-4 py-2">
          <h2 className="font-display text-lg font-semibold text-gold">
            {pane.label}
          </h2>
          <Button
            ref={closeButton}
            variant="ghost"
            aria-label="Close panel"
            onClick={close}
          >
            ✕
          </Button>
        </header>
        <div
          ref={contents}
          className="scroll-gold min-h-0 overflow-y-auto overscroll-contain p-4"
        >
          <div hidden={drawer.pane !== "sheet"}>
            <div className="flex flex-col gap-3">
              <Disclosure title="Abilities and skills" open>
                {panels?.scores ?? (
                  <p className="text-sm text-ink/60">
                    Your character sheet could not be loaded.
                  </p>
                )}
              </Disclosure>
              <Disclosure title="Vitals, proficiencies and features">
                {panels?.vitals}
              </Disclosure>
              <Disclosure title="Your notes">
                <NotesScroll inline campaignId={campaignId} seat={seat} />
              </Disclosure>
              <Disclosure title="World lore">
                <WorldLore
                  inline
                  title={title}
                  lore={lore}
                  mapId={worldMap?.id ?? null}
                  mapUrl={worldMap?.url ?? null}
                />
              </Disclosure>
            </div>
          </div>
          <div hidden={drawer.pane !== "spells"}>
            <SpellBook
              inline
              inlineOpen={drawer.open && drawer.pane === "spells"}
              campaignId={campaignId}
              seat={seat}
              members={carriers}
              casters={casters}
              isDungeonMaster={false}
            />
          </div>
          <div hidden={drawer.pane !== "pack"}>
            <InventoryPack
              inline
              inlineOpen={drawer.open && drawer.pane === "pack"}
              campaignId={campaignId}
              seat={seat}
              members={carriers}
              isDungeonMaster={false}
            />
          </div>
        </div>
      </section>
      <nav
        aria-label="Player panels"
        data-table-arrival-content="bottom"
        className={surfaceClasses({
          variant: "solid",
          className:
            "relative z-40 grid h-[var(--phone-nav-height)] w-full shrink-0 grid-cols-3 gap-1 border-x-0 border-b-0 px-2 pt-0.5 pb-[calc(0.125rem+env(safe-area-inset-bottom))]",
        })}
      >
        {PANES.map(({ value, label, icon: Icon }) => {
          const open = drawer.open && drawer.pane === value;
          return (
            <button
              key={value}
              type="button"
              aria-controls={panelId}
              aria-expanded={open}
              onClick={(event) => choose(event, value)}
              className={`flex min-w-0 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl text-xs transition-colors ${open ? "bg-gold/15 text-gold" : "text-ink/65 hover:bg-gold/5 hover:text-gold"}`}
            >
              <Icon className="size-5" />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Disclosure({ title, open, children }) {
  return (
    <details
      open={open}
      className={surfaceClasses({ className: "rounded-xl p-3" })}
    >
      <summary className="min-h-11 cursor-pointer py-2 font-display text-sm font-semibold text-gold">
        {title}
      </summary>
      <div className="mt-2 flex flex-col gap-3">{children}</div>
    </details>
  );
}
